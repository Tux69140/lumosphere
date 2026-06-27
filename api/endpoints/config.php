<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/config.php';

function endpoint_config(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    // /config/{key} → segments[1] is non-numeric → $action = key, $id = null
    // /config       → $action = null, $id = null
    return match (true) {
        $method === 'GET' && $action !== null  => dal_get_config($pdo, $ctx, $action),
        $method === 'PUT' && $action !== null  => dal_set_config($pdo, $ctx, $action, $body['value'] ?? null),
        $method === 'GET' && $action === null  => dal_list_config($pdo, $ctx),
        default => dal_error('Méthode non supportée.'),
    };
}
