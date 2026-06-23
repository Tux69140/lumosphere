<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/etats.php';

function endpoint_etats(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $id === null => dal_find_etats($pdo, $ctx),
        $method === 'GET' && $id !== null => dal_get_etat($pdo, $ctx, $id),
        $method === 'DELETE' && $id !== null => dal_delete_etat($pdo, $ctx, $id),
        default => dal_error('Méthode non supportée.'),
    };
}
