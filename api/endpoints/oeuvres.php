<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/oeuvres.php';

function endpoint_oeuvres(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $id === null => dal_find_oeuvres(
            $pdo, $ctx,
            isset($_GET['auteur_id']) ? (int) $_GET['auteur_id'] : null
        ),
        $method === 'GET' && $id !== null => dal_get_oeuvre($pdo, $ctx, $id),
        $method === 'POST' && $id === null => dal_create_oeuvre($pdo, $ctx, $body ?? []),
        $method === 'PUT' && $id !== null => dal_update_oeuvre($pdo, $ctx, $id, $body ?? []),
        $method === 'DELETE' && $id !== null => dal_delete_oeuvre($pdo, $ctx, $id),
        default => dal_error('Méthode non supportée.'),
    };
}
