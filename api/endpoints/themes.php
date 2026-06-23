<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/themes.php';

function endpoint_themes(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $id === null => dal_find_themes($pdo, $ctx),
        $method === 'GET' && $id !== null => dal_get_theme($pdo, $ctx, $id),
        $method === 'POST' && $id === null => dal_create_theme($pdo, $ctx, $body ?? []),
        $method === 'PUT' && $id !== null => dal_update_theme($pdo, $ctx, $id, $body ?? []),
        $method === 'DELETE' && $id !== null => dal_delete_theme($pdo, $ctx, $id),
        default => dal_error('Méthode non supportée.'),
    };
}
