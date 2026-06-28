<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

// ──────────────────── Provider Catalog ────────────────────

function dal_ai_provider_catalog(array $config): array
{
    $providers = [
        [
            'key'      => 'mistral',
            'label'    => 'Mistral AI',
            'base_url' => 'https://api.mistral.ai/v1',
            'models'   => ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest'],
            'default'  => 'mistral-small-latest',
        ],
        [
            'key'      => 'openai',
            'label'    => 'OpenAI',
            'base_url' => 'https://api.openai.com/v1',
            'models'   => ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
            'default'  => 'gpt-4o-mini',
        ],
        [
            'key'      => 'anthropic',
            'label'    => 'Anthropic',
            'base_url' => 'https://api.anthropic.com/v1',
            'models'   => ['claude-sonnet-4-20250514', 'claude-haiku-4-20250414'],
            'default'  => 'claude-sonnet-4-20250514',
            'note'     => 'Format API incompatible en mode direct — nécessite proxy LiteLLM',
        ],
        [
            'key'      => 'deepseek',
            'label'    => 'DeepSeek',
            'base_url' => 'https://api.deepseek.com/v1',
            'models'   => ['deepseek-chat'],
            'default'  => 'deepseek-chat',
        ],
        [
            'key'      => 'gemini',
            'label'    => 'Google Gemini',
            'base_url' => '',
            'models'   => ['gemini-2.5-flash', 'gemini-2.5-pro'],
            'default'  => 'gemini-2.5-flash',
            'note'     => 'Format API incompatible en mode direct — nécessite proxy LiteLLM',
        ],
    ];

    foreach ($providers as &$p) {
        $config_key = $p['key'] . '_api_key';
        $p['configured'] = !empty($config[$config_key]);
    }
    unset($p);

    return $providers;
}

// ──────────────────── Settings CRUD ────────────────────

function dal_ai_get_settings(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'admin.settings');

    $config   = require dirname(__DIR__, 2) . '/config/config.php';
    $catalog  = dal_ai_provider_catalog($config);

    $stmt = $pdo->query("SHOW TABLES LIKE 'ia_settings'");
    if ($stmt->rowCount() === 0) {
        return dal_ok([
            'provider'        => $config['litellm_model'] ? 'custom' : 'mistral',
            'model'           => $config['litellm_model'] ?? 'mistral-small-latest',
            'timeout_seconds' => 45,
            'max_retries'     => 2,
            'catalog'         => $catalog,
        ]);
    }

    $row = $pdo->query("SELECT * FROM ia_settings WHERE scope = 'server_default' LIMIT 1")->fetch();
    if (!$row) {
        $row = ['provider' => 'mistral', 'model' => 'mistral-small-latest', 'timeout_seconds' => 45, 'max_retries' => 2];
    }

    return dal_ok([
        'provider'        => $row['provider'],
        'model'           => $row['model'],
        'timeout_seconds' => (int) $row['timeout_seconds'],
        'max_retries'     => (int) $row['max_retries'],
        'catalog'         => $catalog,
    ]);
}

function dal_ai_save_settings(PDO $pdo, array $ctx, string $provider, string $model, int $timeout, int $max_retries): array
{
    dal_require_permission($ctx, 'admin.settings');

    $config  = require dirname(__DIR__, 2) . '/config/config.php';
    $catalog = dal_ai_provider_catalog($config);

    $valid_provider = false;
    foreach ($catalog as $p) {
        if ($p['key'] === $provider) {
            $valid_provider = true;
            if (!in_array($model, $p['models'], true)) {
                return dal_error("Modèle « {$model} » invalide pour le fournisseur « {$provider} ».");
            }
            break;
        }
    }
    if (!$valid_provider) {
        return dal_error("Fournisseur « {$provider} » inconnu.");
    }

    $timeout     = max(5, min(120, $timeout));
    $max_retries = max(0, min(5, $max_retries));

    $stmt = $pdo->prepare(
        "INSERT INTO ia_settings (scope, provider, model, timeout_seconds, max_retries, updated_by)
         VALUES ('server_default', :provider, :model, :timeout, :retries, :uid)
         ON DUPLICATE KEY UPDATE provider = :provider2, model = :model2,
                                  timeout_seconds = :timeout2, max_retries = :retries2,
                                  updated_by = :uid2"
    );
    $stmt->execute([
        'provider'  => $provider,
        'model'     => $model,
        'timeout'   => $timeout,
        'retries'   => $max_retries,
        'uid'       => $ctx['user_id'] ?? null,
        'provider2' => $provider,
        'model2'    => $model,
        'timeout2'  => $timeout,
        'retries2'  => $max_retries,
        'uid2'      => $ctx['user_id'] ?? null,
    ]);

    return dal_ok(['provider' => $provider, 'model' => $model]);
}

// ──────────────────── Prompts CRUD ────────────────────

function dal_ai_get_prompts(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'admin.settings');

    $stmt = $pdo->query("SHOW TABLES LIKE 'ai_prompts'");
    if ($stmt->rowCount() === 0) {
        return dal_ok([]);
    }

    $rows = $pdo->query("SELECT prompt_key, content, updated_at FROM ai_prompts ORDER BY prompt_key")->fetchAll();
    return dal_ok($rows);
}

function dal_ai_update_prompt(PDO $pdo, array $ctx, string $key, string $content): array
{
    dal_require_permission($ctx, 'admin.settings');

    $key = trim($key);
    $content = trim($content);
    if ($key === '' || $content === '') {
        return dal_error('Clé et contenu requis.');
    }

    $stmt = $pdo->prepare(
        "UPDATE ai_prompts SET content = :content, updated_by = :uid WHERE prompt_key = :key"
    );
    $stmt->execute(['content' => $content, 'uid' => $ctx['user_id'] ?? null, 'key' => $key]);

    if ($stmt->rowCount() === 0) {
        return dal_error("Prompt « {$key} » introuvable.");
    }

    return dal_ok();
}

// ──────────────────── Logs ────────────────────

function dal_ai_get_logs(PDO $pdo, array $ctx, ?string $cursor, int $page_size = PAGE_SIZE_DEFAULT): array
{
    dal_require_permission($ctx, 'admin.settings');

    $stmt_check = $pdo->query("SHOW TABLES LIKE 'ai_logs'");
    if ($stmt_check->rowCount() === 0) {
        return dal_ok(['items' => [], 'next_cursor' => null]);
    }

    $params = [];
    $where = '1=1';

    $decoded = dal_decode_cursor($cursor);
    $where .= dal_keyset_clause('created_at', 'id', $decoded, 'DESC', $params);

    $limit = $page_size + 1;
    $sql = "SELECT id, provider, model, action, prompt_tokens, completion_tokens,
                   latency_ms, status, error_message, user_id, created_at
            FROM ai_logs
            WHERE {$where}
            ORDER BY created_at DESC, id DESC
            LIMIT {$limit}";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $has_next = count($rows) > $page_size;
    if ($has_next) {
        array_pop($rows);
    }
    $next_cursor = null;
    if ($has_next && !empty($rows)) {
        $last = end($rows);
        $next_cursor = dal_encode_cursor($last['created_at'], (int) $last['id']);
    }

    return dal_ok(['items' => $rows, 'next_cursor' => $next_cursor]);
}

// ──────────────────── Core LiteLLM call ────────────────────

function _dal_ai_resolve_config(): array
{
    $config = require dirname(__DIR__, 2) . '/config/config.php';

    // Legacy proxy mode: if litellm_base_url is set, use it directly
    if (!empty($config['litellm_base_url'])) {
        return [
            'base_url' => rtrim($config['litellm_base_url'], '/'),
            'api_key'  => $config['litellm_api_key'] ?? '',
            'model'    => $config['litellm_model'] ?? 'gpt-4o-mini',
            'provider' => 'custom',
            'timeout'  => 10,
        ];
    }

    // New mode: read from ia_settings + provider catalog
    try {
        $pdo = dal_get_pdo();
        $check = $pdo->query("SHOW TABLES LIKE 'ia_settings'")->fetchAll();
        if (!empty($check)) {
            $row = $pdo->query("SELECT provider, model, timeout_seconds FROM ia_settings WHERE scope = 'server_default' LIMIT 1")->fetch();
            if ($row) {
                $catalog = dal_ai_provider_catalog($config);
                foreach ($catalog as $p) {
                    if ($p['key'] === $row['provider']) {
                        $config_key = $p['key'] . '_api_key';
                        $base_url = $p['base_url'] ?: '';
                        return [
                            'base_url' => rtrim($base_url, '/'),
                            'api_key'  => $config[$config_key] ?? '',
                            'model'    => $row['model'],
                            'provider' => $row['provider'],
                            'timeout'  => (int) ($row['timeout_seconds'] ?? 45),
                        ];
                    }
                }
            }
        }
    } catch (\Throwable) {
        // Fall through to error
    }

    return ['base_url' => '', 'api_key' => '', 'model' => '', 'provider' => '', 'timeout' => 10];
}

function _dal_litellm_call(array $ctx, string $prompt, string $action = ''): array
{
    $cfg = _dal_ai_resolve_config();

    if ($cfg['base_url'] === '' || $cfg['api_key'] === '') {
        return dal_error('IA non configurée (fournisseur ou clé API manquants).');
    }

    $payload = json_encode([
        'model'    => $cfg['model'],
        'messages' => [
            ['role' => 'user', 'content' => $prompt],
        ],
    ], JSON_THROW_ON_ERROR);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $cfg['base_url'] . '/chat/completions',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_TIMEOUT        => $cfg['timeout'],
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $cfg['api_key'],
        ],
    ]);

    $start_ms = (int) round(microtime(true) * 1000);
    $raw      = curl_exec($ch);
    $latency  = (int) round(microtime(true) * 1000) - $start_ms;

    if ($raw === false) {
        $err = curl_error($ch);
        curl_close($ch);
        _dal_ai_log($ctx, $cfg['provider'], $cfg['model'], $action, 0, 0, $latency, 'error', $err);
        return dal_error('Erreur réseau LiteLLM : ' . $err);
    }

    $http_code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        _dal_ai_log($ctx, $cfg['provider'], $cfg['model'], $action, 0, 0, $latency, 'error', 'HTTP ' . $http_code);
        return dal_error('Réponse LiteLLM non-JSON (HTTP ' . $http_code . ').');
    }

    if ($http_code < 200 || $http_code >= 300) {
        $msg = $decoded['error']['message'] ?? ('HTTP ' . $http_code);
        _dal_ai_log($ctx, $cfg['provider'], $cfg['model'], $action, 0, 0, $latency, 'error', $msg);
        return dal_error('Erreur LiteLLM : ' . $msg);
    }

    $content       = $decoded['choices'][0]['message']['content'] ?? null;
    $prompt_tokens = (int) ($decoded['usage']['prompt_tokens'] ?? 0);
    $compl_tokens  = (int) ($decoded['usage']['completion_tokens'] ?? 0);

    if ($content === null) {
        _dal_ai_log($ctx, $cfg['provider'], $cfg['model'], $action, $prompt_tokens, $compl_tokens, $latency, 'error', 'Empty response');
        return dal_error('Réponse LiteLLM vide ou malformée.');
    }

    _dal_ai_log($ctx, $cfg['provider'], $cfg['model'], $action, $prompt_tokens, $compl_tokens, $latency, 'ok', null);

    return dal_ok($content);
}

function _dal_ai_log(
    array $ctx,
    string $provider,
    string $model,
    string $action,
    int $prompt_tokens,
    int $completion_tokens,
    int $latency_ms,
    string $status,
    ?string $error_message
): void {
    try {
        $pdo = dal_get_pdo();
        $tables = $pdo->query("SHOW TABLES LIKE 'ai_logs'")->fetchAll();
        if (empty($tables)) {
            return;
        }
        $stmt = $pdo->prepare(
            'INSERT INTO ai_logs (provider, model, action, prompt_tokens, completion_tokens, latency_ms, status, error_message, user_id, created_at)
             VALUES (:provider, :model, :action, :prompt_tokens, :completion_tokens, :latency_ms, :status, :error_message, :user_id, NOW())'
        );
        $stmt->execute([
            'provider'          => $provider,
            'model'             => $model,
            'action'            => $action,
            'prompt_tokens'     => $prompt_tokens,
            'completion_tokens' => $completion_tokens,
            'latency_ms'        => $latency_ms,
            'status'            => $status,
            'error_message'     => $error_message,
            'user_id'           => $ctx['user_id'] ?? null,
        ]);
    } catch (\Throwable) {
        // Log failure must never block the AI call
    }
}

// ──────────────────── AI Prompt helpers ────────────────────

function _dal_ai_get_prompt_template(string $key, string $fallback): string
{
    try {
        $pdo   = dal_get_pdo();
        $check = $pdo->query("SHOW TABLES LIKE 'ai_prompts'")->fetchAll();
        if (!empty($check)) {
            $stmt = $pdo->prepare("SELECT content FROM ai_prompts WHERE prompt_key = :key");
            $stmt->execute(['key' => $key]);
            $row = $stmt->fetch();
            if ($row) {
                return $row['content'];
            }
        }
    } catch (\Throwable) {
        // Fallback to hardcoded
    }
    return $fallback;
}

// ──────────────────── Suggest Keywords ────────────────────

function dal_ai_suggest_keywords(PDO $pdo, array $ctx, string $contenu, array $existing_keywords): array
{
    dal_require_permission($ctx, 'corpus.write');

    $kw_list = implode(', ', array_map(
        static fn(array $k) => $k['mot'],
        $existing_keywords
    ));

    $fallback = <<<'PROMPT'
Tu es un assistant éditorial. Voici une citation :

---
{contenu}
---

Mots-clés déjà existants dans la base (utilise-les en priorité si pertinents) :
{kw_list}

Propose jusqu'à 5 mots-clés pertinents pour indexer cette citation.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balise markdown :
{"keywords": ["mot1", "mot2"]}
PROMPT;

    $template = _dal_ai_get_prompt_template('suggest_keywords', $fallback);
    $prompt   = str_replace(['{contenu}', '{kw_list}'], [$contenu, $kw_list], $template);

    $res = _dal_litellm_call($ctx, $prompt, 'suggest_keywords');
    if ($res['status'] !== 'ok') {
        return $res;
    }

    $content = trim((string) $res['data']);
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

// ──────────────────── Suggest Theme ────────────────────

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

    $fallback = <<<'PROMPT'
Tu es un assistant éditorial. Voici une citation :

---
{contenu}
---

Liste des thèmes disponibles :
{themes_list}

Quel thème correspond le mieux à cette citation ?
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balise markdown :
{"theme_id": <id du thème>}
PROMPT;

    $template = _dal_ai_get_prompt_template('suggest_theme', $fallback);
    $prompt   = str_replace(['{contenu}', '{themes_list}'], [$contenu, $themes_list], $template);

    $res = _dal_litellm_call($ctx, $prompt, 'suggest_theme');
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
        return dal_error('L\'IA a suggéré un identifiant de thème invalide.');
    }

    return dal_ok(['theme_id' => $theme_id]);
}

// ──────────────────── Test Connection ────────────────────

function dal_ai_test_connection(array $ctx): array
{
    dal_require_permission($ctx, 'admin.settings');

    $cfg = _dal_ai_resolve_config();
    $res = _dal_litellm_call($ctx, 'Réponds uniquement avec le mot "pong".', 'test_connection');
    if ($res['status'] !== 'ok') {
        return $res;
    }

    return dal_ok(['ok' => true, 'provider' => $cfg['provider'], 'model' => $cfg['model']]);
}
