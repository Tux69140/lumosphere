<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

function _dal_litellm_call(array $ctx, string $prompt): array
{
    $config = require dirname(__DIR__, 2) . '/config/config.php';

    $base_url = rtrim($config['litellm_base_url'] ?? '', '/');
    $api_key  = $config['litellm_api_key'] ?? '';
    $model    = $config['litellm_model'] ?? 'gpt-4o-mini';

    if ($base_url === '' || $api_key === '') {
        return dal_error('LiteLLM non configuré (litellm_base_url / litellm_api_key manquants).');
    }

    $payload = json_encode([
        'model'    => $model,
        'messages' => [
            ['role' => 'user', 'content' => $prompt],
        ],
    ], JSON_THROW_ON_ERROR);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $base_url . '/chat/completions',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $api_key,
        ],
    ]);

    $start_ms = (int) round(microtime(true) * 1000);
    $raw      = curl_exec($ch);
    $latency  = (int) round(microtime(true) * 1000) - $start_ms;

    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        return dal_error('Erreur réseau LiteLLM : ' . $err);
    }

    $http_code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return dal_error('Réponse LiteLLM non-JSON (HTTP ' . $http_code . ').');
    }

    if ($http_code < 200 || $http_code >= 300) {
        $msg = $decoded['error']['message'] ?? ('HTTP ' . $http_code);
        return dal_error('Erreur LiteLLM : ' . $msg);
    }

    $content       = $decoded['choices'][0]['message']['content'] ?? null;
    $prompt_tokens = $decoded['usage']['prompt_tokens'] ?? 0;
    $compl_tokens  = $decoded['usage']['completion_tokens'] ?? 0;

    if ($content === null) {
        return dal_error('Réponse LiteLLM vide ou malformée.');
    }

    _dal_ai_log($ctx, $model, $prompt_tokens, $compl_tokens, $latency);

    return dal_ok($content);
}

function _dal_ai_log(array $ctx, string $model, int $prompt_tokens, int $completion_tokens, int $latency_ms): void
{
    try {
        $pdo = dal_get_pdo();
        $tables = $pdo->query("SHOW TABLES LIKE 'ai_logs'")->fetchAll();
        if (empty($tables)) {
            return;
        }
        $stmt = $pdo->prepare(
            'INSERT INTO ai_logs (user_id, model, prompt_tokens, completion_tokens, latency_ms, created_at)
             VALUES (:user_id, :model, :prompt_tokens, :completion_tokens, :latency_ms, NOW())'
        );
        $stmt->execute([
            'user_id'           => $ctx['user_id'] ?? null,
            'model'             => $model,
            'prompt_tokens'     => $prompt_tokens,
            'completion_tokens' => $completion_tokens,
            'latency_ms'        => $latency_ms,
        ]);
    } catch (\Throwable) {
        // Log failure must never block the AI call.
    }
}

function dal_ai_suggest_keywords(PDO $pdo, array $ctx, string $contenu, array $existing_keywords): array
{
    dal_require_permission($ctx, 'corpus.write');

    $kw_list = implode(', ', array_map(
        static fn(array $k) => $k['mot'],
        $existing_keywords
    ));

    $prompt = <<<PROMPT
Tu es un assistant éditorial. Voici une citation :

---
{$contenu}
---

Mots-clés déjà existants dans la base (utilise-les en priorité si pertinents) :
{$kw_list}

Propose jusqu'à 5 mots-clés pertinents pour indexer cette citation.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balise markdown :
{"keywords": ["mot1", "mot2"]}
PROMPT;

    $res = _dal_litellm_call($ctx, $prompt);
    if ($res['status'] !== 'ok') {
        return $res;
    }

    $content = trim((string) $res['data']);
    // Strip possible markdown code fences
    $content = preg_replace('/^```(?:json)?\s*/i', '', $content);
    $content = preg_replace('/\s*```$/', '', $content);

    $parsed = json_decode($content, true);
    if (!is_array($parsed) || !isset($parsed['keywords']) || !is_array($parsed['keywords'])) {
        return dal_error('Réponse IA inattendue pour les mots-clés.');
    }

    $keywords = array_values(array_filter(
        array_map('strval', $parsed['keywords']),
        static fn(string $k) => $k !== ''
    ));

    return dal_ok(['keywords' => $keywords]);
}

function dal_ai_suggest_theme(PDO $pdo, array $ctx, string $contenu, array $themes): array
{
    dal_require_permission($ctx, 'corpus.write');

    $themes_list = implode("\n", array_map(
        static function (array $t): string {
            $label = $t['nom'];
            if (!empty($t['parent_nom'])) {
                $label = $t['parent_nom'] . ' › ' . $label;
            }
            return '- id=' . $t['id'] . ' : ' . $label;
        },
        $themes
    ));

    $prompt = <<<PROMPT
Tu es un assistant éditorial. Voici une citation :

---
{$contenu}
---

Liste des thèmes disponibles :
{$themes_list}

Quel thème correspond le mieux à cette citation ?
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balise markdown :
{"theme_id": <id du thème>}
PROMPT;

    $res = _dal_litellm_call($ctx, $prompt);
    if ($res['status'] !== 'ok') {
        return $res;
    }

    $content = trim((string) $res['data']);
    $content = preg_replace('/^```(?:json)?\s*/i', '', $content);
    $content = preg_replace('/\s*```$/', '', $content);

    $parsed = json_decode($content, true);
    if (!is_array($parsed) || !array_key_exists('theme_id', $parsed)) {
        return dal_error('Réponse IA inattendue pour le thème.');
    }

    $theme_id = (int) $parsed['theme_id'];
    $valid_ids = array_column($themes, 'id');
    if (!in_array($theme_id, $valid_ids, true)) {
        return dal_error('L'IA a suggéré un identifiant de thème invalide.');
    }

    return dal_ok(['theme_id' => $theme_id]);
}

function dal_ai_test_connection(array $ctx): array
{
    dal_require_permission($ctx, 'admin.settings');

    $config = require dirname(__DIR__, 2) . '/config/config.php';
    $model  = $config['litellm_model'] ?? 'gpt-4o-mini';

    $res = _dal_litellm_call($ctx, 'Réponds uniquement avec le mot "pong".');
    if ($res['status'] !== 'ok') {
        return $res;
    }

    return dal_ok(['ok' => true, 'model' => $model]);
}
