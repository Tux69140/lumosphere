<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/keywords.php';

function endpoint_keywords(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET'    && $id === null                                => dal_find_keywords($pdo, $ctx, $_GET['search'] ?? null),
        $method === 'GET'    && $id !== null && $action === 'usages'        => dal_get_keyword_usages($pdo, $ctx, $id),
        $method === 'POST'   && $id === null && $action === 'find-or-create' => dal_find_or_create_keyword($pdo, $ctx, $body['mot'] ?? ''),
        $method === 'POST'   && $id === null                                => dal_create_keyword($pdo, $ctx, $body['mot'] ?? ''),
        $method === 'PUT'    && $id !== null                                => dal_update_keyword($pdo, $ctx, $id, $body['mot'] ?? ''),
        $method === 'DELETE' && $id !== null                                => dal_delete_keyword($pdo, $ctx, $id),
        default                                                             => dal_error('Méthode non supportée.'),
    };
}
