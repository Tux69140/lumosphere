<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/auteurs.php';

function endpoint_auteurs(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $id === null => dal_find_auteurs(
            $pdo,
            $ctx,
            $_GET['search'] ?? null
        ),
        $method === 'GET' && $id !== null => dal_get_auteur($pdo, $ctx, $id),
        $method === 'POST' && $id === null => dal_create_auteur($pdo, $ctx, $body ?? []),
        $method === 'PUT' && $id !== null => dal_update_auteur($pdo, $ctx, $id, $body ?? []),
        $method === 'DELETE' && $id !== null => dal_delete_auteur($pdo, $ctx, $id),
        default => dal_error('Méthode non supportée.'),
    };
}
