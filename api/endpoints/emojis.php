<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/emojis.php';

function endpoint_emojis(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $id === null    => dal_find_emojis($pdo, $ctx, $_GET['search'] ?? null),
        $method === 'POST' && $id === null   => dal_create_emoji($pdo, $ctx, $body ?? []),
        $method === 'DELETE' && $id !== null => dal_delete_emoji($pdo, $ctx, $id),
        default => dal_error('Méthode non supportée.'),
    };
}
