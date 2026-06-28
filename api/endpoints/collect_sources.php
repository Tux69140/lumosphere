<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/collect_sources.php';

function endpoint_collect_sources(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $id === null && (($_GET['type'] ?? null) === 'telegram')
            => dal_list_telegram_channels($pdo, $ctx),
        $method === 'GET' && $id === null    => dal_find_collect_sources($pdo, $ctx),
        $method === 'GET' && $id !== null    => dal_get_collect_source($pdo, $ctx, $id),
        $method === 'POST' && $id === null   => dal_create_collect_source($pdo, $ctx, $body ?? []),
        $method === 'PUT' && $id !== null    => dal_update_collect_source($pdo, $ctx, $id, $body ?? []),
        $method === 'DELETE' && $id !== null => dal_delete_collect_source($pdo, $ctx, $id),
        default                              => dal_error('Méthode non supportée.'),
    };
}
