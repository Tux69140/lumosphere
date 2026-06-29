<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

// ──────────────────── Provider Catalog ────────────────────

function dal_ai_provider_catalog(array $config): array
{
    // Métadonnées statiques (label, base_url, note, modèles de secours)
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
            'base_url' => 'https://generativelanguage.googleapis.com/v1beta/openai',
            'models'   => ['gemini-2.5-flash', 'gemini-2.5-pro'],
            'default'  => 'gemini-2.5-flash',
        ],
    ];

    // Remplace les modèles statiques par ceux du registre (activés, non dépréciés, JSON supporté)
    $registry_models = [];
    try {
        $pdo   = dal_get_pdo();
        $check = $pdo->query("SHOW TABLES LIKE 'ia_model_registry'")->fetchAll();
        if (!empty($check)) {
            $rows = $pdo->query(
                "SELECT provider, model_id FROM ia_model_registry
                 WHERE enabled = 1 AND deprecated = 0 AND supports_json = 1
                 ORDER BY model_id"
            )->fetchAll();
            foreach ($rows as $r) {
                $registry_models[$r['provider']][] = $r['model_id'];
            }
        }
    } catch (\Throwable) {
        // Fallback sur les modèles statiques ci-dessus
    }

    foreach ($providers as &$p) {
        $config_key = $p['key'] . '_api_key';
        $p['configured'] = !empty($config[$config_key]);
        if (!empty($registry_models[$p['key']])) {
            $p['models'] = $registry_models[$p['key']];
        }
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
        $row = [
            'provider'        => 'mistral',
            'model'           => 'mistral-small-latest',
            'timeout_seconds' => 45,
            'max_retries'     => 2,
        ];
    }

    return dal_ok([
        'provider'        => $row['provider'],
        'model'           => $row['model'],
        'timeout_seconds' => (int) $row['timeout_seconds'],
        'max_retries'     => (int) $row['max_retries'],
        'catalog'         => $catalog,
    ]);
}

function dal_ai_save_settings(
    PDO $pdo,
    array $ctx,
    string $provider,
    string $model,
    int $timeout,
    int $max_retries
): array {
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
            $row = $pdo->query(
                "SELECT provider, model, timeout_seconds FROM ia_settings WHERE scope = 'server_default' LIMIT 1"
            )->fetch();
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

function _dal_ai_classify_error(int $http_code, string $raw_message, string $provider = ''): array
{
    $raw = strtolower($raw_message);
    $name = $provider !== '' ? $provider : 'IA';

    if (
        $http_code === 402
        || str_contains($raw, 'insufficient_quota')
        || str_contains($raw, 'credit balance is too low')
        || str_contains($raw, 'insufficient balance')
    ) {
        return ['origin' => 'fournisseur', 'type' => 'insufficient_credit',
                'message' => "Fournisseur IA ({$name}) : crédit épuisé, rechargez le compte."];
    }
    if (
        $http_code === 401
        || str_contains($raw, 'invalid_api_key')
        || str_contains($raw, 'invalid api key')
        || str_contains($raw, 'authentication')
    ) {
        return ['origin' => 'fournisseur', 'type' => 'invalid_key',
                'message' => "Fournisseur IA ({$name}) : clé API refusée (invalide ou absente)."];
    }
    if ($http_code === 403 || str_contains($raw, 'permission')) {
        return ['origin' => 'fournisseur', 'type' => 'forbidden',
                'message' => "Fournisseur IA ({$name}) : ce modèle n'est pas autorisé pour votre clé."];
    }
    if ($http_code === 404 || str_contains($raw, 'model_not_found')) {
        return ['origin' => 'fournisseur', 'type' => 'model_not_found',
                'message' => "Fournisseur IA ({$name}) : modèle introuvable."];
    }
    if ($http_code === 429 || str_contains($raw, 'rate_limit')) {
        return ['origin' => 'fournisseur', 'type' => 'rate_limit',
                'message' => "Fournisseur IA ({$name}) : trop de requêtes, patientez quelques instants."];
    }
    if (str_contains($raw, 'context_length_exceeded') || str_contains($raw, 'maximum context')) {
        return ['origin' => 'fournisseur', 'type' => 'context_too_long',
                'message' => "Fournisseur IA ({$name}) : texte trop long pour ce modèle."];
    }
    if (str_contains($raw, 'content_policy') || str_contains($raw, 'content_filter')) {
        return ['origin' => 'fournisseur', 'type' => 'content_filtered',
                'message' => "Fournisseur IA ({$name}) : contenu refusé."];
    }
    if ($http_code === 500 || $http_code === 503) {
        return ['origin' => 'fournisseur', 'type' => 'service_unavailable',
                'message' => "Fournisseur IA ({$name}) : service momentanément indisponible."];
    }
    if ($http_code >= 400 && $http_code < 500) {
        return ['origin' => 'fournisseur', 'type' => 'bad_response',
                'message' => "Fournisseur IA ({$name}) : réponse vide ou inattendue."];
    }

    return ['origin' => 'passerelle', 'type' => 'unknown',
            'message' => 'Passerelle IA : erreur inconnue, voir le Journal pour le détail.'];
}

function _dal_litellm_call(array $ctx, string $prompt, string $action = '', ?array $cfg_override = null): array
{
    $cfg = $cfg_override ?? _dal_ai_resolve_config();

    if ($cfg['base_url'] === '' || $cfg['api_key'] === '') {
        return dal_error('Passerelle IA : configuration incomplète (fournisseur ou clé manquants).');
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
        $err_lower = strtolower($err);
        if (str_contains($err_lower, 'timeout') || str_contains($err_lower, 'timed out')) {
            _dal_ai_log(
                $ctx,
                $cfg['provider'],
                $cfg['model'],
                $action,
                0,
                0,
                $latency,
                'error',
                $err,
                'timeout',
                'passerelle'
            );
            return dal_error('Passerelle IA : délai dépassé, pas de réponse à temps.');
        }
        _dal_ai_log(
            $ctx,
            $cfg['provider'],
            $cfg['model'],
            $action,
            0,
            0,
            $latency,
            'error',
            $err,
            'network',
            'passerelle'
        );
        return dal_error('Passerelle IA : connexion au fournisseur impossible.');
    }

    $http_code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        _dal_ai_log(
            $ctx,
            $cfg['provider'],
            $cfg['model'],
            $action,
            0,
            0,
            $latency,
            'error',
            'HTTP ' . $http_code,
            'gateway_bad_response',
            'passerelle'
        );
        return dal_error('Passerelle IA : réponse illisible reçue.');
    }

    if ($http_code < 200 || $http_code >= 300) {
        $raw_msg    = $decoded['error']['message'] ?? ('HTTP ' . $http_code);
        $classified = _dal_ai_classify_error($http_code, $raw_msg, $cfg['provider']);
        _dal_ai_log(
            $ctx,
            $cfg['provider'],
            $cfg['model'],
            $action,
            0,
            0,
            $latency,
            'error',
            $raw_msg,
            $classified['type'],
            $classified['origin']
        );
        return dal_error($classified['message']);
    }

    $content       = $decoded['choices'][0]['message']['content'] ?? null;
    $prompt_tokens = (int) ($decoded['usage']['prompt_tokens'] ?? 0);
    $compl_tokens  = (int) ($decoded['usage']['completion_tokens'] ?? 0);

    if ($content === null) {
        _dal_ai_log(
            $ctx,
            $cfg['provider'],
            $cfg['model'],
            $action,
            $prompt_tokens,
            $compl_tokens,
            $latency,
            'error',
            'Empty response',
            'bad_response',
            'fournisseur'
        );
        return dal_error('Fournisseur IA (' . $cfg['provider'] . ') : réponse vide ou inattendue.');
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
    ?string $error_message,
    ?string $error_type = null,
    ?string $error_origin = null
): void {
    try {
        $pdo = dal_get_pdo();
        $tables = $pdo->query("SHOW TABLES LIKE 'ai_logs'")->fetchAll();
        if (empty($tables)) {
            return;
        }
        $stmt = $pdo->prepare(
            'INSERT INTO ai_logs (provider, model, action, prompt_tokens, completion_tokens, latency_ms, status,'
            . ' error_message, error_type, error_origin, user_id, created_at)'
            . ' VALUES (:provider, :model, :action, :prompt_tokens, :completion_tokens, :latency_ms, :status,'
            . ' :error_message, :error_type, :error_origin, :user_id, NOW())'
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
            'error_type'        => $error_type,
            'error_origin'      => $error_origin,
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

function dal_ai_test_connection(array $ctx, string $provider_override = '', string $model_override = ''): array
{
    dal_require_permission($ctx, 'admin.settings');

    if ($provider_override !== '' && $model_override !== '') {
        $config  = require dirname(__DIR__, 2) . '/config/config.php';
        $catalog = dal_ai_provider_catalog($config);
        $cfg     = null;
        foreach ($catalog as $p) {
            if ($p['key'] === $provider_override) {
                $config_key = $p['key'] . '_api_key';
                $cfg = [
                    'base_url' => rtrim($p['base_url'], '/'),
                    'api_key'  => $config[$config_key] ?? '',
                    'model'    => $model_override,
                    'provider' => $provider_override,
                    'timeout'  => 10,
                ];
                break;
            }
        }
        if ($cfg === null) {
            return dal_error("Fournisseur inconnu : {$provider_override}.");
        }
    } else {
        $cfg = _dal_ai_resolve_config();
    }

    $res = _dal_litellm_call($ctx, 'Réponds uniquement avec le mot "pong".', 'test_connection', $cfg);
    if ($res['status'] !== 'ok') {
        return $res;
    }

    return dal_ok(['ok' => true, 'provider' => $cfg['provider'], 'model' => $cfg['model']]);
}

// ──────────────────── Model Registry ────────────────────

function dal_ai_registry_list(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'admin.settings');

    $check = $pdo->query("SHOW TABLES LIKE 'ia_model_registry'")->fetchAll();
    if (empty($check)) {
        return dal_ok(['providers' => [], 'last_refreshed_at' => null]);
    }

    $rows = $pdo->query(
        "SELECT provider, model_id, label, enabled, deprecated,
                pricing_input_per_million_usd, pricing_output_per_million_usd,
                pricing_source, context_window, supports_json, supports_vision,
                notes, last_seen_at, last_refreshed_at
         FROM ia_model_registry
         ORDER BY provider, deprecated, model_id"
    )->fetchAll();

    $last_refresh = null;
    $by_provider  = [];

    foreach ($rows as $row) {
        if ($row['last_refreshed_at'] && (!$last_refresh || $row['last_refreshed_at'] > $last_refresh)) {
            $last_refresh = $row['last_refreshed_at'];
        }
        $key = $row['provider'];
        $row['usable']                          = (bool) (
            $row['enabled'] && !$row['deprecated'] && $row['supports_json']
        );
        $row['enabled']                         = (bool) $row['enabled'];
        $row['deprecated']                      = (bool) $row['deprecated'];
        $row['supports_json']                   = (bool) $row['supports_json'];
        $row['supports_vision']                 = (bool) $row['supports_vision'];
        $row['context_window']                  = (int) $row['context_window'];
        $row['pricing_input_per_million_usd']   = $row['pricing_input_per_million_usd'] !== null
            ? (float) $row['pricing_input_per_million_usd']
            : null;
        $row['pricing_output_per_million_usd']  = $row['pricing_output_per_million_usd'] !== null
            ? (float) $row['pricing_output_per_million_usd']
            : null;
        $by_provider[$key][] = $row;
    }

    return dal_ok(['providers' => $by_provider, 'last_refreshed_at' => $last_refresh]);
}

function dal_ai_registry_toggle(PDO $pdo, array $ctx, string $provider, string $model_id, bool $enabled): array
{
    dal_require_permission($ctx, 'admin.settings');

    $check = $pdo->query("SHOW TABLES LIKE 'ia_model_registry'")->fetchAll();
    if (empty($check)) {
        return dal_error('Table ia_model_registry absente (migration 012 non appliquée).');
    }

    if ($enabled) {
        $row = $pdo->prepare(
            "SELECT deprecated, supports_json FROM ia_model_registry WHERE provider = :p AND model_id = :m"
        );
        $row->execute(['p' => $provider, 'm' => $model_id]);
        $data = $row->fetch();
        if (!$data) {
            return dal_error('Modèle introuvable.');
        }
        if ($data['deprecated']) {
            return dal_error('Impossible d\'activer un modèle déprécié.');
        }
        if (!$data['supports_json']) {
            return dal_error('Ce modèle ne supporte pas les réponses JSON et ne peut pas être activé.');
        }
    }

    $stmt = $pdo->prepare(
        "UPDATE ia_model_registry SET enabled = :enabled, updated_by = :uid
         WHERE provider = :provider AND model_id = :model_id"
    );
    $stmt->execute([
        'enabled'  => $enabled ? 1 : 0,
        'uid'      => $ctx['user_id'] ?? null,
        'provider' => $provider,
        'model_id' => $model_id,
    ]);

    if ($stmt->rowCount() === 0) {
        return dal_error('Modèle introuvable.');
    }

    return dal_ok();
}

function dal_ai_registry_override(PDO $pdo, array $ctx, array $body): array
{
    dal_require_permission($ctx, 'admin.settings');

    $check = $pdo->query("SHOW TABLES LIKE 'ia_model_registry'")->fetchAll();
    if (empty($check)) {
        return dal_error('Table ia_model_registry absente (migration 012 non appliquée).');
    }

    $provider = trim((string) ($body['provider'] ?? ''));
    $model_id = trim((string) ($body['model_id'] ?? ''));
    if ($provider === '' || $model_id === '') {
        return dal_error('provider et model_id requis.');
    }

    // Réinitialisation vers les données communautaires LiteLLM
    if (!empty($body['reset_pricing'])) {
        $community_data = _dal_ai_load_community_pricing($pdo);
        $lookup         = _dal_ai_community_lookup($community_data, $provider, $model_id);

        if (empty($lookup)) {
            $st = $pdo->prepare(
                "UPDATE ia_model_registry
                 SET pricing_source = 'community',
                     pricing_input_per_million_usd  = NULL,
                     pricing_output_per_million_usd = NULL,
                     updated_by = :uid
                 WHERE provider = :provider AND model_id = :model_id"
            );
            $st->execute(['uid' => $ctx['user_id'] ?? null, 'provider' => $provider, 'model_id' => $model_id]);
            return dal_ok(null, 'Source réinitialisée — modèle absent de la base LiteLLM, tarifs vidés.');
        }

        $st = $pdo->prepare(
            "UPDATE ia_model_registry
             SET pricing_source                 = 'community',
                 pricing_input_per_million_usd  = :price_in,
                 pricing_output_per_million_usd = :price_out,
                 context_window                 = :ctx,
                 supports_json                  = :supports_json,
                 supports_vision                = :supports_vision,
                 deprecated                     = :deprecated,
                 updated_by                     = :uid
             WHERE provider = :provider AND model_id = :model_id"
        );
        $st->execute([
            'price_in'        => $lookup['pricing_input'],
            'price_out'       => $lookup['pricing_output'],
            'ctx'             => $lookup['context_window'],
            'supports_json'   => $lookup['supports_json'],
            'supports_vision' => $lookup['supports_vision'],
            'deprecated'      => $lookup['deprecated'],
            'uid'             => $ctx['user_id'] ?? null,
            'provider'        => $provider,
            'model_id'        => $model_id,
        ]);
        return dal_ok(null, 'Tarifs réinitialisés depuis la base LiteLLM.');
    }

    $fields = [];
    $params = ['uid' => $ctx['user_id'] ?? null, 'provider' => $provider, 'model_id' => $model_id];

    if (array_key_exists('pricing_input_per_million_usd', $body)) {
        $v = $body['pricing_input_per_million_usd'];
        if ($v !== null && (float) $v < 0) {
            return dal_error('Le prix ne peut pas être négatif.');
        }
        $fields[]             = 'pricing_input_per_million_usd = :price_in';
        $params['price_in']   = $v !== null ? (float) $v : null;
    }
    if (array_key_exists('pricing_output_per_million_usd', $body)) {
        $v = $body['pricing_output_per_million_usd'];
        if ($v !== null && (float) $v < 0) {
            return dal_error('Le prix ne peut pas être négatif.');
        }
        $fields[]              = 'pricing_output_per_million_usd = :price_out';
        $params['price_out']   = $v !== null ? (float) $v : null;
    }
    if (array_key_exists('context_window', $body)) {
        $v = (int) $body['context_window'];
        if ($v < 0) {
            return dal_error('La taille de contexte ne peut pas être négative.');
        }
        $fields[]           = 'context_window = :context';
        $params['context']  = $v;
    }
    if (array_key_exists('notes', $body)) {
        $fields[]         = 'notes = :notes';
        $params['notes']  = trim((string) ($body['notes'] ?? '')) ?: null;
    }

    if (empty($fields)) {
        return dal_error('Aucun champ à mettre à jour.');
    }

    $fields[] = "pricing_source = 'manual'";
    $fields[] = 'updated_by = :uid';

    $stmt = $pdo->prepare(
        'UPDATE ia_model_registry SET ' . implode(', ', $fields) .
        ' WHERE provider = :provider AND model_id = :model_id'
    );
    $stmt->execute($params);

    if ($stmt->rowCount() === 0) {
        return dal_error('Modèle introuvable.');
    }

    return dal_ok();
}

function dal_ai_usage_summary(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'admin.settings');

    $log_check = $pdo->query("SHOW TABLES LIKE 'ai_logs'")->fetchAll();
    if (empty($log_check)) {
        return dal_ok(['total_usd' => 0.0, 'by_provider' => []]);
    }

    $rows = $pdo->query(
        "SELECT provider, model,
                SUM(prompt_tokens) AS total_prompt,
                SUM(completion_tokens) AS total_completion,
                COUNT(*) AS calls
         FROM ai_logs
         WHERE status = 'ok'
         GROUP BY provider, model
         ORDER BY provider, model"
    )->fetchAll();

    // Chargement des tarifs du registre
    $pricing = [];
    $reg_check = $pdo->query("SHOW TABLES LIKE 'ia_model_registry'")->fetchAll();
    if (!empty($reg_check)) {
        $reg_rows = $pdo->query(
            "SELECT provider, model_id,
                    pricing_input_per_million_usd,
                    pricing_output_per_million_usd
             FROM ia_model_registry"
        )->fetchAll();
        foreach ($reg_rows as $r) {
            $pricing[$r['provider']][$r['model_id']] = [
                'in'  => $r['pricing_input_per_million_usd'] !== null
                    ? (float) $r['pricing_input_per_million_usd']
                    : null,
                'out' => $r['pricing_output_per_million_usd'] !== null
                    ? (float) $r['pricing_output_per_million_usd']
                    : null,
            ];
        }
    }

    $by_provider = [];
    $total_usd   = 0.0;

    foreach ($rows as $row) {
        $p        = $row['provider'];
        $m        = $row['model'];
        $prompt_m = (float) $row['total_prompt']     / 1e6;
        $compl_m  = (float) $row['total_completion'] / 1e6;

        $price_in  = $pricing[$p][$m]['in']  ?? null;
        $price_out = $pricing[$p][$m]['out'] ?? null;

        $estimated_usd = null;
        if ($price_in !== null && $price_out !== null) {
            $estimated_usd = $prompt_m * $price_in + $compl_m * $price_out;
            $total_usd    += $estimated_usd;
        }

        if (!isset($by_provider[$p])) {
            $by_provider[$p] = ['models' => [], 'subtotal_usd' => 0.0];
        }
        if ($estimated_usd !== null) {
            $by_provider[$p]['subtotal_usd'] += $estimated_usd;
        }

        $by_provider[$p]['models'][] = [
            'model'             => $m,
            'calls'             => (int) $row['calls'],
            'prompt_tokens'     => (int) $row['total_prompt'],
            'completion_tokens' => (int) $row['total_completion'],
            'estimated_usd'     => $estimated_usd,
        ];
    }

    return dal_ok(['total_usd' => $total_usd, 'by_provider' => $by_provider]);
}

// ──────────────────── Models Refresh ────────────────────

function dal_ai_models_refresh(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'admin.settings');

    $reg_check = $pdo->query("SHOW TABLES LIKE 'ia_model_registry'")->fetchAll();
    if (empty($reg_check)) {
        return dal_error('Migration 012 non appliquée (table ia_model_registry absente).');
    }

    $config         = require dirname(__DIR__, 2) . '/config/config.php';
    $catalog_meta   = dal_ai_provider_catalog($config);
    $configured     = array_filter($catalog_meta, static fn(array $p) => $p['configured']);

    if (empty($configured)) {
        return dal_error('Aucun fournisseur configuré (aucune clé API trouvée).');
    }

    // Chargement/rafraîchissement du JSON communautaire LiteLLM
    $community = _dal_ai_load_community_pricing($pdo);

    // Interrogation des fournisseurs en parallèle
    $fetch_results = _dal_ai_multi_fetch_models(array_values($configured), $config, 8);

    $summary = [];
    foreach ($configured as $p) {
        $key    = $p['key'];
        $result = $fetch_results[$key] ?? ['models' => [], 'error' => 'Pas de réponse.'];

        if ($result['error'] !== null) {
            $summary[] = ['key' => $key, 'count' => 0, 'error' => $result['error']];
            continue;
        }

        $models    = $result['models'];
        $seen_ids  = [];

        foreach ($models as $model) {
            $community_data = _dal_ai_community_lookup($community, $key, $model['id']);
            _dal_ai_upsert_registry($pdo, $key, $model, $community_data, $ctx['user_id'] ?? null);
            $seen_ids[] = $model['id'];
        }

        _dal_ai_mark_deprecated($pdo, $key, $seen_ids);
        $summary[] = ['key' => $key, 'count' => count($seen_ids), 'error' => null];
    }

    return dal_ok(['providers' => $summary, 'refreshed_at' => date('Y-m-d H:i:s')]);
}

function _dal_ai_load_community_pricing(PDO $pdo): array
{
    $cache_check = $pdo->query("SHOW TABLES LIKE 'ia_model_catalog_cache'")->fetchAll();
    if (!empty($cache_check)) {
        $stmt = $pdo->prepare(
            "SELECT catalog_json, expires_at FROM ia_model_catalog_cache WHERE provider = '_community'"
        );
        $stmt->execute();
        $cached = $stmt->fetch();
        if ($cached && $cached['expires_at'] > date('Y-m-d H:i:s')) {
            $decoded = json_decode($cached['catalog_json'], true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
    }

    // Téléchargement du JSON communautaire
    $url = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';
    $ch  = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_USERAGENT      => 'Lumosphere/1.0',
    ]);
    $raw_json  = curl_exec($ch);
    $http_code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($raw_json === false || $http_code !== 200) {
        // Fallback : cache expiré si disponible
        if (!empty($cache_check)) {
            $stmt = $pdo->prepare(
                "SELECT catalog_json FROM ia_model_catalog_cache WHERE provider = '_community'"
            );
            $stmt->execute();
            $old = $stmt->fetch();
            if ($old) {
                $decoded = json_decode($old['catalog_json'], true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        }
        return [];
    }

    $decoded = json_decode($raw_json, true);
    if (!is_array($decoded)) {
        return [];
    }

    // Mise en cache 24 h
    if (!empty($cache_check)) {
        $stmt = $pdo->prepare(
            "INSERT INTO ia_model_catalog_cache (provider, catalog_json, refreshed_at, expires_at)
             VALUES ('_community', :json, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR))
             ON DUPLICATE KEY UPDATE
               catalog_json = :json2,
               refreshed_at = NOW(),
               expires_at   = DATE_ADD(NOW(), INTERVAL 24 HOUR),
               last_error   = NULL"
        );
        $stmt->execute(['json' => $raw_json, 'json2' => $raw_json]);
    }

    return $decoded;
}

function _dal_ai_multi_fetch_models(array $providers, array $config, int $timeout = 8): array
{
    $mh      = curl_multi_init();
    $handles = [];

    foreach ($providers as $p) {
        $key     = $p['key'];
        $api_key = $config[$key . '_api_key'] ?? '';
        $ch      = curl_init();

        switch ($key) {
            case 'anthropic':
                $url     = 'https://api.anthropic.com/v1/models';
                $headers = [
                    'x-api-key: ' . $api_key,
                    'anthropic-version: 2023-06-01',
                    'Content-Type: application/json',
                ];
                break;
            case 'gemini':
                $url     = 'https://generativelanguage.googleapis.com/v1beta/models?key='
                           . urlencode($api_key) . '&pageSize=100';
                $headers = ['Content-Type: application/json'];
                break;
            default:
                $base    = rtrim($p['base_url'] ?? '', '/');
                $url     = $base . '/models';
                $headers = [
                    'Authorization: Bearer ' . $api_key,
                    'Content-Type: application/json',
                ];
                break;
        }

        curl_setopt_array($ch, [
            CURLOPT_URL            => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_HTTPGET        => true,
        ]);

        curl_multi_add_handle($mh, $ch);
        $handles[$key] = $ch;
    }

    $running = null;
    do {
        $status = curl_multi_exec($mh, $running);
        if ($running > 0) {
            curl_multi_select($mh, 0.1);
        }
    } while ($running > 0 && $status === CURLM_OK);

    $results = [];

    foreach ($handles as $key => $ch) {
        $raw       = curl_multi_getcontent($ch);
        $http_code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_err  = curl_error($ch);
        curl_multi_remove_handle($mh, $ch);
        curl_close($ch);

        if ($raw === null || $curl_err !== '') {
            $results[$key] = ['models' => [], 'error' => 'Erreur réseau : ' . $curl_err];
            continue;
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            $results[$key] = ['models' => [], 'error' => 'Réponse non-JSON (HTTP ' . $http_code . ')'];
            continue;
        }

        if ($http_code < 200 || $http_code >= 300) {
            $msg = $data['error']['message'] ?? ('HTTP ' . $http_code);
            $results[$key] = ['models' => [], 'error' => $msg];
            continue;
        }

        $results[$key] = ['models' => _dal_ai_parse_provider_models($key, $data), 'error' => null];
    }

    curl_multi_close($mh);

    return $results;
}

/**
 * Retourne false pour les modèles non destinés à la génération de texte (embedding,
 * TTS, image, modération, robotique…). Empêche la liste de gonfler après refresh.
 */
function _dal_ai_is_chat_model(string $provider, string $model_id): bool
{
    $lower = strtolower($model_id);

    // Fragments universellement non-chat
    $global_exclude = ['embed', 'whisper', 'dall-e', 'moderation', 'robotics', 'tts'];
    foreach ($global_exclude as $frag) {
        if (str_contains($lower, $frag)) {
            return false;
        }
    }

    // OpenAI : liste blanche stricte (ils publient aussi davinci, babbage, codex, audio…)
    if ($provider === 'openai') {
        foreach (['gpt-', 'o1-', 'o2-', 'o3-', 'o4-', 'chatgpt-'] as $prefix) {
            if (str_starts_with($lower, $prefix)) {
                return true;
            }
        }
        return false;
    }

    // Gemini : exclure les variantes non-texte qui passent quand même generateContent
    if ($provider === 'gemini') {
        foreach (['-image', 'learnlm', 'antigravity', 'video-generation', 'imagen'] as $frag) {
            if (str_contains($lower, $frag)) {
                return false;
            }
        }
    }

    return true;
}

function _dal_ai_parse_provider_models(string $provider, array $data): array
{
    $models = [];

    if ($provider === 'gemini') {
        foreach ($data['models'] ?? [] as $m) {
            $name      = preg_replace('/^models\//', '', $m['name'] ?? '');
            $supported = $m['supportedGenerationMethods'] ?? [];
            if ($name === '' || !in_array('generateContent', $supported, true)) {
                continue;
            }
            if (!_dal_ai_is_chat_model($provider, $name)) {
                continue;
            }
            $models[] = [
                'id'             => $name,
                'label'          => $m['displayName'] ?? $name,
                'context_window' => (int) ($m['inputTokenLimit'] ?? 0),
            ];
        }
    } elseif ($provider === 'anthropic') {
        foreach ($data['data'] ?? [] as $m) {
            $id = $m['id'] ?? '';
            if ($id !== '' && _dal_ai_is_chat_model($provider, $id)) {
                $models[] = ['id' => $id, 'label' => $m['display_name'] ?? $id, 'context_window' => 0];
            }
        }
    } else {
        foreach ($data['data'] ?? [] as $m) {
            $id = $m['id'] ?? '';
            if ($id !== '' && _dal_ai_is_chat_model($provider, $id)) {
                $models[] = ['id' => $id, 'label' => $id, 'context_window' => 0];
            }
        }
    }

    return $models;
}

function _dal_ai_community_lookup(array $community, string $provider, string $model_id): array
{
    $data = $community["{$provider}/{$model_id}"] ?? $community[$model_id] ?? null;
    if (!is_array($data)) {
        return [];
    }

    $input_cost  = isset($data['input_cost_per_token'])  ? (float) $data['input_cost_per_token']  * 1e6 : null;
    $output_cost = isset($data['output_cost_per_token']) ? (float) $data['output_cost_per_token'] * 1e6 : null;
    $context     = (int) ($data['max_input_tokens'] ?? 0);
    $supports_json   = (
        !empty($data['supports_function_calling']) || !empty($data['supports_response_schema'])
    ) ? 1 : 0;
    $supports_vision = !empty($data['supports_vision']) ? 1 : 0;

    $deprecated = 0;
    if (!empty($data['deprecation_date'])) {
        $dep_ts = strtotime((string) $data['deprecation_date']);
        if ($dep_ts !== false && $dep_ts < time()) {
            $deprecated = 1;
        }
    }

    return [
        'pricing_input'   => $input_cost,
        'pricing_output'  => $output_cost,
        'context_window'  => $context,
        'supports_json'   => $supports_json,
        'supports_vision' => $supports_vision,
        'deprecated'      => $deprecated,
    ];
}

function _dal_ai_upsert_registry(PDO $pdo, string $provider, array $model, array $community, ?int $user_id): void
{
    $input_price    = $community['pricing_input']   ?? null;
    $output_price   = $community['pricing_output']  ?? null;
    $context_window = $model['context_window']      ?? ($community['context_window'] ?? 0);
    $supports_json  = $community['supports_json']   ?? 0;
    $supports_vision = $community['supports_vision'] ?? 0;
    $deprecated     = $community['deprecated']      ?? 0;
    $source         = !empty($community)            ? 'community' : 'unknown';

    $stmt = $pdo->prepare(
        "INSERT INTO ia_model_registry
           (provider, model_id, label, enabled, pricing_source,
            pricing_input_per_million_usd, pricing_output_per_million_usd,
            context_window, supports_json, supports_vision, deprecated,
            last_seen_at, last_refreshed_at, updated_by)
         VALUES
           (:provider, :model_id, :label, 0, :source,
            :price_in, :price_out,
            :context, :json, :vision, :dep,
            NOW(), NOW(), :uid)
         ON DUPLICATE KEY UPDATE
           label             = :label2,
           last_seen_at      = NOW(),
           last_refreshed_at = NOW(),
           deprecated        = 0,
           pricing_source    = IF(pricing_source = 'manual', pricing_source, :source2),
           pricing_input_per_million_usd  = IF(pricing_source = 'manual', pricing_input_per_million_usd,  :price_in2),
           pricing_output_per_million_usd = IF(pricing_source = 'manual', pricing_output_per_million_usd, :price_out2),
           context_window    = IF(pricing_source = 'manual', context_window,  :context2),
           supports_json     = IF(pricing_source = 'manual', supports_json,   :json2),
           supports_vision   = IF(pricing_source = 'manual', supports_vision, :vision2)"
    );
    $stmt->execute([
        'provider'  => $provider,
        'model_id'  => $model['id'],
        'label'     => $model['label'],
        'source'    => $source,
        'price_in'  => $input_price,
        'price_out' => $output_price,
        'context'   => $context_window,
        'json'      => $supports_json,
        'vision'    => $supports_vision,
        'dep'       => $deprecated,
        'uid'       => $user_id,
        'label2'    => $model['label'],
        'source2'   => $source,
        'price_in2' => $input_price,
        'price_out2' => $output_price,
        'context2'  => $context_window,
        'json2'     => $supports_json,
        'vision2'   => $supports_vision,
    ]);
}

function _dal_ai_mark_deprecated(PDO $pdo, string $provider, array $seen_ids): void
{
    if (empty($seen_ids)) {
        return;
    }
    $placeholders = implode(',', array_fill(0, count($seen_ids), '?'));
    $stmt = $pdo->prepare(
        "UPDATE ia_model_registry
         SET deprecated = 1, enabled = 0
         WHERE provider = ? AND model_id NOT IN ({$placeholders}) AND deprecated = 0"
    );
    $stmt->execute(array_merge([$provider], $seen_ids));
}
