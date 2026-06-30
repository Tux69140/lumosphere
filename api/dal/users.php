<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';
require_once __DIR__ . '/password_tokens.php';

function dal_find_users(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'admin.users');
    $rows = $pdo->query(
        'SELECT u.id, u.prenom, u.nom, u.email, u.role_id, r.nom AS role_nom,
                u.created_at, u.updated_at,
                (u.password_set_at IS NOT NULL) AS is_activated
         FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.nom, u.prenom'
    )->fetchAll();
    $rows = array_map(function (array $row): array {
        $row['is_activated'] = (bool) $row['is_activated'];
        return $row;
    }, $rows);
    return dal_ok($rows);
}

/**
 * Public user info — never returns password_hash.
 */
function dal_get_user(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'admin.users');
    $stmt = $pdo->prepare(
        'SELECT u.id, u.prenom, u.nom, u.email, u.role_id, r.nom AS role_nom, u.created_at, u.updated_at
         FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = :id'
    );
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ? dal_ok($row) : dal_error('Utilisateur introuvable.');
}

/**
 * Auth-only: returns password_hash. Used by login (Phase 6.2), not by API.
 */
function dal_get_user_for_auth(PDO $pdo, string $email): ?array
{
    $stmt = $pdo->prepare(
        'SELECT id, prenom, nom, email, password_hash, role_id, password_set_at
         FROM users WHERE email = :email'
    );
    $stmt->execute(['email' => $email]);
    return $stmt->fetch() ?: null;
}

function dal_create_user(PDO $pdo, array $ctx, array $data, string $ip = ''): array
{
    dal_require_permission($ctx, 'admin.users');
    $email = trim($data['email'] ?? '');
    if ($email === '') {
        return dal_error('L\'email est requis.');
    }
    if (empty($data['role_id'])) {
        return dal_error('Le rôle est requis.');
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO users (prenom, nom, email, password_hash, role_id)
             VALUES (:prenom, :nom, :email, :password_hash, :role_id)'
        );
        $stmt->execute([
            'prenom'        => trim($data['prenom'] ?? ''),
            'nom'           => trim($data['nom']    ?? ''),
            'email'         => $email,
            'password_hash' => '!', // placeholder : compte non activé (password_set_at IS NULL)
            'role_id'       => (int) $data['role_id'],
        ]);
        $user_id = (int) $pdo->lastInsertId();

        // Révoquer tout ancien jeton d'invitation et créer le nouveau
        dal_token_revoke_user_tokens($pdo, $user_id, 'invite');
        $token = dal_token_create($pdo, $user_id, 'invite', 7 * 24 * 3600, $ip);
        $pdo->commit();

        return dal_ok(['id' => $user_id, 'invite_token' => $token]);
    } catch (\PDOException $e) {
        $pdo->rollBack();
        if ($e->getCode() === '23000') {
            return dal_error('Un utilisateur avec cet email existe déjà.');
        }
        throw $e;
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function dal_update_user(PDO $pdo, array $ctx, int $id, array $data): array
{
    dal_require_permission($ctx, 'admin.users');
    $stmt = $pdo->prepare('SELECT id, role_id FROM users WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $current = $stmt->fetch();
    if (!$current) {
        return dal_error('Utilisateur introuvable.');
    }

    if (
        array_key_exists('role_id', $data)
        && (int) $current['role_id'] === ROLE_ADMIN
        && (int) $data['role_id'] !== ROLE_ADMIN
    ) {
        if (_dal_count_admins($pdo) <= 1) {
            return dal_error('Impossible de rétrograder le dernier administrateur.');
        }
    }

    $params = ['id' => $id];
    $fields = _dal_build_update_fields($data, ['prenom', 'nom', 'email', 'role_id'], $params);
    if (empty($fields)) {
        return dal_error('Aucun champ à mettre à jour.');
    }

    try {
        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $pdo->prepare($sql)->execute($params);
        return dal_ok(['id' => $id]);
    } catch (\PDOException $e) {
        if ($e->getCode() === '23000') {
            return dal_error('Un utilisateur avec cet email existe déjà.');
        }
        throw $e;
    }
}

function dal_delete_user(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'admin.users');

    $stmt = $pdo->prepare('SELECT role_id FROM users WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $user = $stmt->fetch();
    if (!$user) {
        return dal_error('Utilisateur introuvable.');
    }

    // Protect last admin
    if ((int) $user['role_id'] === ROLE_ADMIN && _dal_count_admins($pdo) <= 1) {
        return dal_error('Impossible de supprimer le dernier administrateur.');
    }

    $pdo->prepare('DELETE FROM users WHERE id = :id')->execute(['id' => $id]);
    return dal_ok();
}

/**
 * Renvoie un lien d'invitation à un compte non encore activé.
 * Retourne une erreur si le compte est déjà activé (password_set_at IS NOT NULL).
 */
function dal_resend_invite(PDO $pdo, array $ctx, int $user_id, string $ip = ''): array
{
    dal_require_permission($ctx, 'admin.users');
    $stmt = $pdo->prepare('SELECT id, prenom, nom, email, password_set_at FROM users WHERE id = :id');
    $stmt->execute(['id' => $user_id]);
    $user = $stmt->fetch();
    if (!$user) {
        return dal_error('Utilisateur introuvable.');
    }
    if ($user['password_set_at'] !== null) {
        return dal_error('Ce compte est déjà activé. Utilisez la réinitialisation de mot de passe.');
    }

    $pdo->beginTransaction();
    try {
        dal_token_revoke_user_tokens($pdo, $user_id, 'invite');
        $token = dal_token_create($pdo, $user_id, 'invite', 7 * 24 * 3600, $ip);
        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    return dal_ok(['invite_token' => $token, 'user' => $user]);
}

/**
 * Compte les comptes ayant le rôle Administrateur (garde « dernier admin »).
 */
function _dal_count_admins(PDO $pdo): int
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE role_id = :role_id');
    $stmt->execute(['role_id' => ROLE_ADMIN]);
    return (int) $stmt->fetchColumn();
}
