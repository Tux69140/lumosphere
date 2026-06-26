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

function dal_create_role(PDO $pdo, array $ctx, string $nom, array $permission_ids): array
{
    dal_require_permission($ctx, 'admin.roles');
    $nom = trim($nom);
    if ($nom === '') {
        return dal_error('Le nom du rôle est requis.');
    }
    $ids = array_values(array_unique(array_filter(
        array_map('intval', $permission_ids),
        static fn (int $v): bool => $v > 0
    )));

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('INSERT INTO roles (nom) VALUES (:nom)');
        $stmt->execute(['nom' => $nom]);
        $id = (int) $pdo->lastInsertId();
        $stmt = $pdo->prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :perm_id)');
        foreach ($ids as $perm_id) {
            $stmt->execute(['role_id' => $id, 'perm_id' => $perm_id]);
        }
        $pdo->commit();
        return dal_ok(['id' => $id, 'nom' => $nom]);
    } catch (\Throwable $e) {
        $pdo->rollBack();
        return dal_error('Erreur lors de la création du rôle.');
    }
}

function dal_update_role(PDO $pdo, array $ctx, int $id, string $nom): array
{
    dal_require_permission($ctx, 'admin.roles');
    if ($id === ROLE_ADMIN) {
        return dal_error('Le rôle Administrateur ne peut pas être renommé.');
    }
    $nom = trim($nom);
    if ($nom === '') {
        return dal_error('Le nom du rôle est requis.');
    }
    $stmt = $pdo->prepare('UPDATE roles SET nom = :nom WHERE id = :id');
    $stmt->execute(['nom' => $nom, 'id' => $id]);
    return $stmt->rowCount() > 0
        ? dal_ok(['id' => $id, 'nom' => $nom])
        : dal_error('Rôle introuvable.');
}

/**
 * Lecture des œuvres réservées à un rôle.
 */
function dal_get_role_oeuvre_access(PDO $pdo, array $ctx, int $role_id): array
{
    dal_require_permission($ctx, 'admin.roles');
    $stmt = $pdo->prepare('SELECT oeuvre_id FROM role_oeuvre_access WHERE role_id = :rid ORDER BY oeuvre_id');
    $stmt->execute(['rid' => $role_id]);
    $ids = array_map(static fn ($r) => (int) $r['oeuvre_id'], $stmt->fetchAll());
    return dal_ok(['oeuvre_ids' => $ids]);
}

/**
 * Remplace l'ensemble des œuvres réservées à un rôle — transaction.
 */
function dal_set_role_oeuvre_access(PDO $pdo, array $ctx, int $role_id, array $oeuvre_ids): array
{
    dal_require_permission($ctx, 'admin.roles');
    $ids = array_values(array_unique(array_filter(
        array_map('intval', $oeuvre_ids),
        static fn (int $v): bool => $v > 0
    )));

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM role_oeuvre_access WHERE role_id = :rid')->execute(['rid' => $role_id]);
        $stmt = $pdo->prepare('INSERT INTO role_oeuvre_access (role_id, oeuvre_id) VALUES (:rid, :oid)');
        foreach ($ids as $oid) {
            $stmt->execute(['rid' => $role_id, 'oid' => $oid]);
        }
        $pdo->commit();
        return dal_ok(['oeuvre_ids' => $ids]);
    } catch (\Throwable $e) {
        $pdo->rollBack();
        return dal_error('Erreur lors de la mise à jour des accès par œuvre.');
    }
}
