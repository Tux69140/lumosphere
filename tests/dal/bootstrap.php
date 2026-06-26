<?php

declare(strict_types=1);

require_once __DIR__ . '/../../api/dal/core.php';

function get_test_pdo(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }
    $pdo = dal_get_pdo([
        'db_host' => '127.0.0.1',
        'db_name' => 'lumosphere_test',
        'db_user' => 'lumo_test',
        'db_pass' => 'lumo_test_pwd',
    ]);
    return $pdo;
}

function create_test_ctx(
    int $role_id = ROLE_ADMIN,
    ?int $user_id = 1,
    bool $include_deleted = false
): array {
    $roles = [
        ROLE_ADMIN    => 'Administrateur',
        ROLE_EDITEUR  => 'Éditeur',
        ROLE_VISITEUR => 'Visiteur',
        ROLE_ABO3     => 'Abo3',
        ROLE_ABO4     => 'Abo4',
    ];

    $all_perms = [
        'corpus.read', 'corpus.read_all', 'corpus.write', 'corpus.delete',
        'admin.users', 'admin.roles', 'admin.settings',
        'oeuvres.manage', 'themes.manage', 'keywords.manage',
        'export.request', 'atelier.access', 'atelier.lots',
        'atelier.validate', 'atelier.sources', 'admin.sessions',
    ];

    $perms_map = [
        ROLE_ADMIN   => $all_perms,
        ROLE_EDITEUR => [
            'corpus.read', 'corpus.read_all', 'corpus.write', 'corpus.delete',
            'oeuvres.manage', 'themes.manage', 'keywords.manage',
            'export.request', 'atelier.access', 'atelier.lots', 'atelier.validate',
        ],
        ROLE_VISITEUR => ['corpus.read'],
        ROLE_ABO3     => ['corpus.read'],
        ROLE_ABO4     => ['corpus.read'],
    ];

    return [
        'user_id'         => $user_id,
        'role_id'         => $role_id,
        'role_nom'        => $roles[$role_id] ?? 'Inconnu',
        'permissions'     => $perms_map[$role_id] ?? [],
        'include_deleted' => $include_deleted,
    ];
}

/**
 * Truncate all data tables for a clean test state.
 */
function reset_test_db(PDO $pdo): void
{
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
    $tables = ['citations', 'citation_keywords', 'keywords', 'themes', 'oeuvres', 'auteurs',
               'users', 'user_favorites', 'local_favorites', 'role_oeuvre_access',
               'active_sessions', 'notifications', 'mediatheque', 'bibliotheque',
               'emojis', 'export_jobs', 'config', 'collect_sources'];
    foreach ($tables as $t) {
        $pdo->exec("TRUNCATE TABLE {$t}");
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
}

/**
 * Seed default roles and permissions if they don't exist, clear any extra roles.
 */
function seed_default_roles(PDO $pdo): void
{
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
    // Delete all roles (to ensure clean state)
    $pdo->exec('DELETE FROM role_permissions');
    $pdo->exec('DELETE FROM roles');

    $roles = [
        ROLE_ADMIN    => 'Administrateur',
        ROLE_EDITEUR  => 'Éditeur',
        ROLE_VISITEUR => 'Visiteur',
        ROLE_ABO3     => 'Abo3',
        ROLE_ABO4     => 'Abo4',
    ];

    // Get permissions from all_permissions table
    $stmt = $pdo->prepare('SELECT id FROM permissions ORDER BY id');
    $stmt->execute();
    $all_perm_ids = array_column($stmt->fetchAll(), 'id');

    // Permission assignments per role (by permission ID)
    $perm_map = [
        ROLE_ADMIN   => $all_perm_ids, // Admin gets all permissions
        ROLE_EDITEUR => [1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14],
        ROLE_VISITEUR => [1],
        ROLE_ABO3     => [1],
        ROLE_ABO4     => [1],
    ];

    // Insert roles
    foreach ($roles as $id => $nom) {
        $stmt = $pdo->prepare('INSERT INTO roles (id, nom) VALUES (:id, :nom)');
        $stmt->execute(['id' => $id, 'nom' => $nom]);
    }

    // Insert role_permissions
    $stmt = $pdo->prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :perm_id)');
    foreach ($perm_map as $role_id => $perm_ids) {
        foreach ($perm_ids as $perm_id) {
            $stmt->execute(['role_id' => $role_id, 'perm_id' => $perm_id]);
        }
    }

    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
}
