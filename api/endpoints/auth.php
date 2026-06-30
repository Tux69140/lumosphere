<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/users.php';
require_once dirname(__DIR__) . '/dal/auth.php';
require_once dirname(__DIR__) . '/dal/config.php';
require_once dirname(__DIR__) . '/dal/password_tokens.php';
require_once dirname(__DIR__) . '/dal/password_policy.php';
require_once dirname(__DIR__) . '/lib/mailer.php';
require_once dirname(__DIR__) . '/templates/mail_invite.php';
require_once dirname(__DIR__) . '/templates/mail_reset.php';

function endpoint_auth(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $action === 'csrf'     => _auth_csrf(),
        $method === 'GET' && $action === 'me'       => _auth_me($pdo, $ctx),
        $method === 'POST' && $action === 'login'   => _auth_login($pdo, $body ?? []),
        $method === 'POST' && $action === 'logout'  => _auth_logout($pdo),
        $method === 'POST' && $action === 'setup'   => _auth_setup($pdo, $body ?? []),
        $method === 'GET' && $action === 'sessions' => dal_auth_find_active_sessions($pdo, $ctx),
        $method === 'DELETE' && $action === 'sessions' && $id !== null
            => dal_auth_force_logout($pdo, $ctx, $id),
        $method === 'GET'  && $action === 'token-info'      => _auth_token_info($pdo, $_GET['token'] ?? ''),
        $method === 'POST' && $action === 'set-password'    => _auth_set_password($pdo, $body ?? []),
        $method === 'POST' && $action === 'forgot-password' => _auth_forgot_password($pdo, $body ?? []),
        default => dal_error('Méthode non supportée.'),
    };
}

function _auth_init_session(PDO $pdo, int $user_id, int $role_id, bool $remember = false): void
{
    session_regenerate_id(true);
    $permissions = dal_auth_load_permissions($pdo, $role_id);
    $_SESSION['user_id']            = $user_id;
    $_SESSION['role_id']            = $role_id;
    $_SESSION['permissions']        = $permissions;
    $_SESSION['last_activity']      = time();
    $_SESSION['login_at']           = time();
    $_SESSION['remember']           = $remember;
    $_SESSION['session_token_hash'] = hash('sha256', session_id());
    dal_auth_create_session($pdo, $user_id, session_id());

    if ($remember) {
        setcookie(session_name(), session_id(), [
            'expires'  => time() + REMEMBER_DURATION,
            'path'     => '/',
            'secure'   => true,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}

function _auth_csrf(): array
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return dal_ok(['csrf_token' => $_SESSION['csrf_token']]);
}

function _auth_me(PDO $pdo, array $ctx): array
{
    if ($ctx['user_id'] === null) {
        return dal_ok(null);
    }
    $stmt = $pdo->prepare(
        'SELECT u.id, u.prenom, u.nom, u.email, u.role_id, r.nom AS role_nom
         FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = :id'
    );
    $stmt->execute(['id' => $ctx['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        return dal_ok(null);
    }
    unset($user['password_hash']);
    return dal_ok($user);
}

function _auth_login(PDO $pdo, array $body): array
{
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';

    if ($email === '' || $password === '') {
        return dal_error('Email et mot de passe requis.');
    }

    // Anti-force-brute : blocage par e-mail OU par IP.
    $rate = dal_auth_check_rate_limit($pdo, $email);
    $rate_ip = dal_auth_check_rate_limit_ip($pdo, $ip);
    if ($rate['locked'] || $rate_ip['locked']) {
        $remaining = max($rate['remaining_seconds'], $rate_ip['remaining_seconds']);
        $minutes = (int) ceil($remaining / 60);
        return dal_error("Trop de tentatives. Réessayez dans {$minutes} minutes.");
    }

    $user = dal_get_user_for_auth($pdo, $email);
    $dummy_hash = '$2y$12$000000000000000000000uGHKMGRE8kIjzMSmMKmKmKmKmKmKmK';
    $hash = $user ? $user['password_hash'] : $dummy_hash;
    if (!$user || !password_verify($password, $hash)) {
        dal_auth_record_failed_attempt($pdo, $email);
        dal_auth_record_failed_attempt_ip($pdo, $ip);
        return dal_error('Identifiants incorrects.');
    }

    dal_auth_clear_attempts($pdo, $email);
    dal_auth_clear_attempts_ip($pdo, $ip);

    // Connexion réussie — vérifier que le compte est activé
    if ($user['password_set_at'] === null) {
        return dal_error("Votre compte n'est pas encore activé. Vérifiez vos emails pour définir votre mot de passe.");
    }

    $remember = !empty($body['remember']);
    _auth_init_session($pdo, (int) $user['id'], (int) $user['role_id'], $remember);

    return dal_ok([
        'id'       => (int) $user['id'],
        'prenom'   => $user['prenom'],
        'nom'      => $user['nom'],
        'email'    => $user['email'],
        'role_id'  => (int) $user['role_id'],
    ]);
}

function _auth_logout(PDO $pdo): array
{
    $token_hash = $_SESSION['session_token_hash'] ?? null;
    if ($token_hash !== null) {
        dal_auth_invalidate_session($pdo, $token_hash);
    }

    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            $params['secure'],
            $params['httponly']
        );
    }

    session_destroy();
    return dal_ok();
}

function _auth_setup(PDO $pdo, array $body): array
{
    if (dal_auth_has_any_user($pdo)) {
        return dal_error('L\'application est déjà configurée.');
    }

    $secret = $body['setup_secret'] ?? '';
    if (!dal_auth_verify_setup_secret($pdo, $secret)) {
        return dal_error('Code secret invalide.');
    }

    $password = $body['password'] ?? '';
    $password_confirm = $body['password_confirm'] ?? '';
    if ($password !== $password_confirm) {
        return dal_error('Les mots de passe ne correspondent pas.');
    }

    $result = dal_auth_create_first_admin($pdo, $body);
    if ($result['status'] !== 'ok') {
        return $result;
    }

    dal_auth_delete_setup_secret($pdo);

    $user_id = (int) $result['data']['id'];
    _auth_init_session($pdo, $user_id, ROLE_ADMIN);

    return dal_ok([
        'id'      => $user_id,
        'prenom'  => trim($body['prenom'] ?? ''),
        'nom'     => trim($body['nom'] ?? ''),
        'email'   => trim($body['email'] ?? ''),
        'role_id' => ROLE_ADMIN,
    ]);
}

function _auth_token_info(PDO $pdo, string $raw_token): array
{
    if ($raw_token === '') {
        return dal_error('Jeton manquant.');
    }
    $token = dal_token_find_valid($pdo, $raw_token);
    if ($token === null) {
        return dal_error('Ce lien est invalide ou a expiré.');
    }
    // Charger le rôle de l'utilisateur pour que le frontend adapte la jauge de force
    $stmt = $pdo->prepare('SELECT role_id FROM users WHERE id = :id');
    $stmt->execute(['id' => $token['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        return dal_error('Utilisateur introuvable.');
    }
    return dal_ok(['role_id' => (int) $user['role_id'], 'type' => $token['type']]);
}

function _auth_set_password(PDO $pdo, array $body): array
{
    $raw_token = trim($body['token'] ?? '');
    $password  = $body['password'] ?? '';

    if ($raw_token === '') {
        return dal_error('Jeton manquant.');
    }

    $token = dal_token_find_valid($pdo, $raw_token);
    if ($token === null) {
        return dal_error('Ce lien est invalide ou a expiré. Demandez un nouvel envoi.');
    }

    $stmt = $pdo->prepare('SELECT id, prenom, nom, email, role_id FROM users WHERE id = :id');
    $stmt->execute(['id' => $token['user_id']]);
    $user = $stmt->fetch();
    if (!$user) {
        return dal_error('Utilisateur introuvable.');
    }

    // Valider la force du mot de passe
    $errors = dal_password_validate(
        $password,
        (int) $user['role_id'],
        $user['email'],
        $user['prenom'],
        $user['nom']
    );
    if (!empty($errors)) {
        return dal_error($errors[0]);
    }

    // Appliquer le nouveau mot de passe et activer le compte
    $pdo->prepare(
        'UPDATE users SET password_hash = :hash, password_set_at = NOW() WHERE id = :id'
    )->execute([
        'hash' => password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]),
        'id'   => $user['id'],
    ]);

    // Consommer le jeton (usage unique)
    dal_token_consume($pdo, (int) $token['id']);

    return dal_ok(['message' => 'Mot de passe défini avec succès. Vous pouvez maintenant vous connecter.']);
}

function _auth_forgot_password(PDO $pdo, array $body): array
{
    $email = trim($body['email'] ?? '');
    // Réponse toujours identique (anti-énumération)
    $neutral_response = dal_ok(['message' => "Si un compte existe pour cette adresse, un email vient d'être envoyé."]);

    if ($email === '') {
        return $neutral_response;
    }

    // Rate-limiting par email (réutilise l'infrastructure existante)
    $rl = _dal_auth_rl_check($pdo, 'password_reset_attempts', 'email', $email);
    if ($rl['locked']) {
        return $neutral_response; // Silencieux pour ne pas aider l'attaquant
    }

    $stmt = $pdo->prepare('SELECT id, prenom, nom, email, role_id, password_set_at FROM users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || $user['password_set_at'] === null) {
        // Compte inexistant ou non activé : ne rien faire, réponse neutre
        return $neutral_response;
    }

    _dal_auth_rl_record($pdo, 'password_reset_attempts', 'email', $email);

    // Révoquer les anciens jetons de reset et créer le nouveau
    dal_token_revoke_user_tokens($pdo, (int) $user['id'], 'reset');
    $ip    = $_SERVER['REMOTE_ADDR'] ?? '';
    $token = dal_token_create($pdo, (int) $user['id'], 'reset', 3600, $ip);

    $origin    = $GLOBALS['app_config']['allowed_origin'] ?? '';
    $reset_url = "{$origin}/definir-mot-de-passe?token={$token}";

    $tpl = mail_template_reset($user['prenom'], $reset_url);
    send_mail($user['email'], "{$user['prenom']} {$user['nom']}", $tpl['subject'], $tpl['html'], $tpl['text']);

    return $neutral_response;
}
