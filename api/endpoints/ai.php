<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/ai.php';
require_once dirname(__DIR__) . '/dal/keywords.php';
require_once dirname(__DIR__) . '/dal/themes.php';

function endpoint_ai(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'POST' && $action === 'suggest-keywords' => (static function () use ($pdo, $ctx, $body): array {
            $contenu = trim((string) ($body['contenu'] ?? ''));
            if ($contenu === '') {
                return dal_error('Le contenu est requis.');
            }
            $kw_res = dal_find_keywords($pdo, $ctx);
            $existing = ($kw_res['status'] === 'ok' && is_array($kw_res['data'])) ? $kw_res['data'] : [];
            return dal_ai_suggest_keywords($pdo, $ctx, $contenu, $existing);
        })(),

        $method === 'POST' && $action === 'suggest-theme' => (static function () use ($pdo, $ctx, $body): array {
            $contenu = trim((string) ($body['contenu'] ?? ''));
            if ($contenu === '') {
                return dal_error('Le contenu est requis.');
            }
            $thm_res = dal_find_themes($pdo, $ctx);
            if ($thm_res['status'] !== 'ok' || !is_array($thm_res['data'])) {
                return dal_error('Impossible de charger les thèmes.');
            }
            // Enrich with parent_nom for prompt context
            $themes_raw = $thm_res['data'];
            $parent_map = [];
            foreach ($themes_raw as $t) {
                if ($t['parent_id'] === null) {
                    $parent_map[(int) $t['id']] = $t['nom'];
                }
            }
            $themes = array_map(static function (array $t) use ($parent_map): array {
                $t['parent_nom'] = $t['parent_id'] !== null ? ($parent_map[(int) $t['parent_id']] ?? null) : null;
                return $t;
            }, $themes_raw);
            return dal_ai_suggest_theme($pdo, $ctx, $contenu, $themes);
        })(),

        $method === 'POST' && $action === 'test-connection' => dal_ai_test_connection($ctx),

        default => dal_error('Méthode non supportée.'),
    };
}
