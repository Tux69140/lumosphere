<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/users.php';

function endpoint_users(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $id === null => dal_find_users($pdo, $ctx),
        $method === 'GET' && $id !== null => dal_get_user($pdo, $ctx, $id),
        $method === 'POST' && $id === null => dal_create_user($pdo, $ctx, $body ?? []),
        $method === 'PUT' && $id !== null => dal_update_user($pdo, $ctx, $id, $body ?? []),
        $method === 'DELETE' && $id !== null => dal_delete_user($pdo, $ctx, $id),
        default => dal_error('Méthode non supportée.'),
    };
}
