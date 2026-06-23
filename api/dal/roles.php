<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

function dal_find_roles(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'corpus.read');
    $stmt = $pdo->prepare('SELECT id, nom, created_at, updated_at FROM roles ORDER BY id');
    $stmt->execute();
    $rows = $stmt->fetchAll();
    return dal_ok($rows);
}

function dal_get_role_with_permissions(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'admin.roles');
    $stmt = $pdo->prepare('SELECT id, nom FROM roles WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $role = $stmt->fetch();
    if (!$role) {
        return dal_error('Rôle introuvable.');
    }

    $stmt = $pdo->prepare(
        'SELECT p.id, p.code, p.description
         FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         WHERE rp.role_id = :role_id
         ORDER BY p.id'
    );
    $stmt->execute(['role_id' => $id]);
    $role['permissions'] = $stmt->fetchAll();
    return dal_ok($role);
}

/**
 * R4 — Administrateur role cannot be deleted.
 */
function dal_delete_role(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'admin.roles');
    if ($id === ROLE_ADMIN) {
        return dal_error('Le rôle Administrateur ne peut pas être supprimé.');
    }
    $stmt = $pdo->prepare('DELETE FROM roles WHERE id = :id');
    $stmt->execute(['id' => $id]);
    return $stmt->rowCount() > 0 ? dal_ok() : dal_error('Rôle introuvable.');
}

/**
 * R4 — Administrateur permissions cannot be modified.
 */
function dal_update_role_permissions(PDO $pdo, array $ctx, int $role_id, array $permission_ids): array
{
    dal_require_permission($ctx, 'admin.roles');
    if ($role_id === ROLE_ADMIN) {
        return dal_error('Les permissions du rôle Administrateur ne peuvent pas être modifiées.');
    }

    $stmt = $pdo->prepare('SELECT id FROM roles WHERE id = :id');
    $stmt->execute(['id' => $role_id]);
    if (!$stmt->fetch()) {
        return dal_error('Rôle introuvable.');
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM role_permissions WHERE role_id = :role_id')
            ->execute(['role_id' => $role_id]);
        $stmt = $pdo->prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :perm_id)');
        foreach ($permission_ids as $perm_id) {
            $stmt->execute(['role_id' => $role_id, 'perm_id' => (int) $perm_id]);
        }
        $pdo->commit();
        return dal_ok();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        return dal_error('Erreur lors de la mise à jour des permissions.');
    }
}
