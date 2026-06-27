<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/collect_sources.php';

function endpoint_collect_sources(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $id === null => dal_find_collect_sources($pdo, $ctx),
        default                           => dal_error('Méthode non supportée.'),
    };
}
