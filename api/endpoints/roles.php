<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/roles.php';

function endpoint_roles(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET'    && $id !== null && $action === 'oeuvres'       => dal_get_role_oeuvre_access($pdo, $ctx, $id),
        $method === 'PUT'    && $id !== null && $action === 'oeuvres'       => dal_set_role_oeuvre_access(
            $pdo, $ctx, $id, $body['oeuvre_ids'] ?? []
        ),
        $method === 'POST'   && $id === null                                => dal_create_role(
            $pdo, $ctx, $body['nom'] ?? '', $body['permission_ids'] ?? []
        ),
        $method === 'PUT'    && $id !== null && $action === null            => dal_update_role(
            $pdo, $ctx, $id, $body['nom'] ?? ''
        ),
        $method === 'GET'    && $id === null                                => dal_find_roles($pdo, $ctx),
        $method === 'GET'    && $id !== null                                => dal_get_role_with_permissions($pdo, $ctx, $id),
        $method === 'PUT'    && $id !== null && $action === 'permissions'   => dal_update_role_permissions(
            $pdo, $ctx, $id, $body['permission_ids'] ?? []
        ),
        $method === 'DELETE' && $id !== null                                => dal_delete_role($pdo, $ctx, $id),
        default                                                             => dal_error('Méthode non supportée.'),
    };
}
