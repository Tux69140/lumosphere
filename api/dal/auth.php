<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/password_policy.php';

const MAX_LOGIN_ATTEMPTS   = 5;
const LOCKOUT_DURATION     = 1800; // 30 minutes
const SESSION_IDLE_TIMEOUT = 7200; // 2 heures
const SESSION_PURGE_DAYS   = 90;
const REMEMBER_DURATION = 2592000; // 30 jours (en secondes)

/**
 * Détermine si une session est expirée.
 * - remember : limite absolue de 30 jours depuis la connexion.
 * - sinon    : 2 h d'inactivité.
 */
function dal_auth_is_session_expired(array $session, int $now): bool
{
    if (!empty($session['remember'])) {
        $login_at = (int) ($session['login_at'] ?? 0);
        return ($now - $login_at) > REMEMBER_DURATION;
    }
    $last = (int) ($session['last_activity'] ?? 0);
    return ($now - $last) > SESSION_IDLE_TIMEOUT;
}

/**
 * Anti-force-brute générique. $table/$col sont des identifiants internes
 * (jamais de saisie client) ; la valeur testée est liée en paramètre.
 */
function _dal_auth_rl_check(PDO $pdo, string $table, string $col, string $value): array
{
    $stmt = $pdo->prepare("SELECT attempt_count, last_attempt_at FROM {$table} WHERE {$col} = :v");
    $stmt->execute(['v' => $value]);
    $row = $stmt->fetch();

    if (!$row) {
        return ['locked' => false, 'remaining_seconds' => 0];
    }

    $elapsed = time() - strtotime($row['last_attempt_at']);
    if ($elapsed >= LOCKOUT_DURATION) {
        $pdo->prepare("DELETE FROM {$table} WHERE {$col} = :v")->execute(['v' => $value]);
        return ['locked' => false, 'remaining_seconds' => 0];
    }

    if ((int) $row['attempt_count'] >= MAX_LOGIN_ATTEMPTS) {
        return ['locked' => true, 'remaining_seconds' => LOCKOUT_DURATION - $elapsed];
    }

    return ['locked' => false, 'remaining_seconds' => 0];
}

function _dal_auth_rl_record(PDO $pdo, string $table, string $col, string $value): void
{
    $stmt = $pdo->prepare(
        "INSERT INTO {$table} ({$col}, attempt_count, last_attempt_at)
         VALUES (:v, 1, NOW())
         ON DUPLICATE KEY UPDATE attempt_count = attempt_count + 1, last_attempt_at = NOW()"
    );
    $stmt->execute(['v' => $value]);
}

function _dal_auth_rl_clear(PDO $pdo, string $table, string $col, string $value): void
{
    $pdo->prepare("DELETE FROM {$table} WHERE {$col} = :v")->execute(['v' => $value]);
}

function dal_auth_check_rate_limit(PDO $pdo, string $email): array
{
    return _dal_auth_rl_check($pdo, 'login_attempts', 'email', $email);
}

function dal_auth_record_failed_attempt(PDO $pdo, string $email): void
{
    _dal_auth_rl_record($pdo, 'login_attempts', 'email', $email);
}

function dal_auth_clear_attempts(PDO $pdo, string $email): void
{
    _dal_auth_rl_clear($pdo, 'login_attempts', 'email', $email);
}

function dal_auth_check_rate_limit_ip(PDO $pdo, string $ip): array
{
    return _dal_auth_rl_check($pdo, 'login_attempts_ip', 'ip', $ip);
}

function dal_auth_record_failed_attempt_ip(PDO $pdo, string $ip): void
{
    _dal_auth_rl_record($pdo, 'login_attempts_ip', 'ip', $ip);
}

function dal_auth_clear_attempts_ip(PDO $pdo, string $ip): void
{
    _dal_auth_rl_clear($pdo, 'login_attempts_ip', 'ip', $ip);
}

function dal_auth_load_permissions(PDO $pdo, int $role_id): array
{
    $stmt = $pdo->prepare(
        'SELECT p.code FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         WHERE rp.role_id = :role_id ORDER BY p.code'
    );
    $stmt->execute(['role_id' => $role_id]);
    return array_column($stmt->fetchAll(), 'code');
}

function dal_auth_create_session(PDO $pdo, int $user_id, string $session_id): void
{
    dal_auth_purge_old_sessions($pdo);

    $stmt = $pdo->prepare(
        'INSERT INTO active_sessions (user_id, session_token_hash, ip, user_agent)
         VALUES (:user_id, :token_hash, :ip, :user_agent)'
    );
    $stmt->execute([
        'user_id'    => $user_id,
        'token_hash' => hash('sha256', $session_id),
        'ip'         => $_SERVER['REMOTE_ADDR'] ?? '',
        'user_agent' => mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 512),
    ]);
}

function dal_auth_invalidate_session(PDO $pdo, string $session_token_hash): void
{
    $pdo->prepare(
        'UPDATE active_sessions SET invalidated_at = NOW() WHERE session_token_hash = :hash AND invalidated_at IS NULL'
    )->execute(['hash' => $session_token_hash]);
}

function dal_auth_is_session_revoked(PDO $pdo, string $session_token_hash): bool
{
    $stmt = $pdo->prepare(
        'SELECT invalidated_at FROM active_sessions WHERE session_token_hash = :hash ORDER BY id DESC LIMIT 1'
    );
    $stmt->execute(['hash' => $session_token_hash]);
    $row = $stmt->fetch();
    return $row !== false && $row['invalidated_at'] !== null;
}

function dal_auth_update_last_seen(PDO $pdo, string $session_token_hash): void
{
    $pdo->prepare(
        'UPDATE active_sessions SET last_seen = NOW() WHERE session_token_hash = :hash AND invalidated_at IS NULL'
    )->execute(['hash' => $session_token_hash]);
}

function dal_auth_find_active_sessions(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'admin.sessions');
    $rows = $pdo->prepare(
        'SELECT s.id, s.user_id, u.prenom, u.nom, u.email, s.ip, s.user_agent,
                s.last_seen, s.created_at, s.invalidated_at
         FROM active_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.invalidated_at IS NULL
         ORDER BY s.last_seen DESC'
    );
    $rows->execute();
    return dal_ok($rows->fetchAll());
}

function dal_auth_force_logout(PDO $pdo, array $ctx, int $session_id): array
{
    dal_require_permission($ctx, 'admin.sessions');
    $stmt = $pdo->prepare(
        'UPDATE active_sessions SET invalidated_at = NOW() WHERE id = :id AND invalidated_at IS NULL'
    );
    $stmt->execute(['id' => $session_id]);
    return $stmt->rowCount() > 0 ? dal_ok() : dal_error('Session introuvable ou déjà terminée.');
}

function dal_auth_purge_old_sessions(PDO $pdo): int
{
    $stmt = $pdo->prepare(
        'DELETE FROM active_sessions WHERE created_at < DATE_SUB(NOW(), INTERVAL :days DAY)'
    );
    $stmt->execute(['days' => SESSION_PURGE_DAYS]);
    return $stmt->rowCount();
}

function dal_auth_has_any_user(PDO $pdo): bool
{
    $stmt = $pdo->prepare('SELECT 1 FROM users LIMIT 1');
    $stmt->execute();
    return $stmt->fetch() !== false;
}

function dal_auth_verify_setup_secret(PDO $pdo, string $secret): bool
{
    $stored = dal_config_value($pdo, 'setup_secret');
    return $stored !== null && $stored !== '' && hash_equals($stored, $secret);
}

function dal_auth_delete_setup_secret(PDO $pdo): void
{
    $pdo->prepare("DELETE FROM config WHERE cle = 'setup_secret'")->execute();
}

function dal_auth_create_first_admin(PDO $pdo, array $data): array
{
    $prenom = trim($data['prenom'] ?? '');
    $nom = trim($data['nom'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if ($email === '') {
        return dal_error('L\'email est requis.');
    }
    $pwd_errors = dal_password_validate(
        $password,
        ROLE_ADMIN,
        $email,
        $prenom,
        $nom
    );
    if (!empty($pwd_errors)) {
        return dal_error($pwd_errors[0]);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO users (prenom, nom, email, password_hash, role_id, password_set_at)
         VALUES (:prenom, :nom, :email, :password_hash, :role_id, :password_set_at)'
    );
    $stmt->execute([
        'prenom'           => $prenom,
        'nom'              => $nom,
        'email'            => $email,
        'password_hash'    => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
        'role_id'          => ROLE_ADMIN,
        'password_set_at'  => date('Y-m-d H:i:s'),
    ]);
    return dal_ok(['id' => (int) $pdo->lastInsertId()]);
}
