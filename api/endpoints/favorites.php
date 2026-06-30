<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/favorites.php';

function endpoint_favorites(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $id === null => dal_get_user_favorites(
            $pdo,
            $ctx,
            $_GET['cursor'] ?? null,
            max(1, min(MAX_PAGE_SIZE, (int) ($_GET['page_size'] ?? PAGE_SIZE_DEFAULT)))
        ),
        $method === 'POST' && $id !== null => dal_add_favorite($pdo, $ctx, $id),
        $method === 'DELETE' && $id !== null => dal_remove_favorite($pdo, $ctx, $id),
        default => dal_error('Méthode non supportée.'),
    };
}
