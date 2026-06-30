<?php

declare(strict_types=1);

// Composer autoload (PHPMailer et autres dépendances)
$_composer_autoload = dirname(__DIR__) . '/vendor/autoload.php';
if (file_exists($_composer_autoload)) {
    require_once $_composer_autoload;
}
unset($_composer_autoload);

/**
 * Vide et détruit la session courante (expiration / révocation par un admin).
 */
function _clear_session(): void
{
    $_SESSION = [];
    session_destroy();
}

// Load config (outside repo) — avant session_start() pour configurer session.save_path
$config = require dirname(__DIR__) . '/config/config.php';
$GLOBALS['app_config'] = $config;
date_default_timezone_set($config['timezone'] ?? 'Europe/Paris');

// Session config
// session.save_path doit pointer vers un dossier privé hors /tmp partagé (o2switch purge /tmp à 24 min).
if (!empty($config['session_save_path'])) {
    ini_set('session.save_path', $config['session_save_path']);
    // Activer le GC maison pour éviter l'accumulation de fichiers dans ce dossier privé.
    ini_set('session.gc_probability', '1');
    ini_set('session.gc_divisor', '100');
}
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', '1');
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.gc_maxlifetime', '2592000'); // 30 jours : préserver les sessions « se souvenir de moi »
session_start();

// PDO
require_once __DIR__ . '/dal/core.php';
$pdo = dal_get_pdo($config);

// Auth DAL (constants + functions needed for session checks)
require_once __DIR__ . '/dal/auth.php';

// CORS
$allowed_origin = $config['allowed_origin'] ?? '';
if ($allowed_origin !== '' && isset($_SERVER['HTTP_ORIGIN'])) {
    if ($_SERVER['HTTP_ORIGIN'] === $allowed_origin) {
        header("Access-Control-Allow-Origin: {$allowed_origin}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    }
}

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// JSON output
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

// Parse URI for setup-mode check and CSRF bypass
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/api/#', '', $uri);
$first_segment = explode('/', trim($path, '/'))[0] ?? '';
$second_segment = explode('/', trim($path, '/'))[1] ?? '';

// Setup mode: block all routes except auth/csrf and auth/setup when no user exists
if ($first_segment === 'auth' && in_array($second_segment, ['csrf', 'setup', 'login', 'token-info', 'set-password', 'forgot-password'], true)) {
    // These routes are always accessible
} elseif (!dal_auth_has_any_user($pdo)) {
    http_response_code(503);
    echo json_encode([
        'status' => 'error',
        'data' => null,
        'errors' => ['Application non configurée. Créez le premier administrateur.'],
    ]);
    exit;
}

// Session expiration check (2h idle / 30j remember)
if (isset($_SESSION['user_id'], $_SESSION['last_activity'])) {
    if (dal_auth_is_session_expired($_SESSION, time())) {
        $token_hash = $_SESSION['session_token_hash'] ?? null;
        if ($token_hash !== null) {
            dal_auth_invalidate_session($pdo, $token_hash);
        }
        _clear_session();
        http_response_code(401);
        echo json_encode(['status' => 'error', 'data' => null, 'errors' => ['Session expirée.']]);
        exit;
    }

    // Check if session was revoked by admin
    $token_hash = $_SESSION['session_token_hash'] ?? null;
    if ($token_hash !== null && dal_auth_is_session_revoked($pdo, $token_hash)) {
        _clear_session();
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'data' => null,
            'errors' => ['Session révoquée par un administrateur.'],
        ]);
        exit;
    }

    // Update activity timestamp + last_seen in DB
    $_SESSION['last_activity'] = time();
    if ($token_hash !== null) {
        dal_auth_update_last_seen($pdo, $token_hash);
    }

    // Rafraîchir le cookie persistant des sessions « se souvenir de moi »
    if (!empty($_SESSION['remember'])) {
        setcookie(session_name(), session_id(), [
            'expires'  => time() + REMEMBER_DURATION,
            'path'     => '/',
            'secure'   => true,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}

// CSRF check on mutations
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'DELETE'], true)) {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $session_token = $_SESSION['csrf_token'] ?? '';
    // Skip CSRF for login and setup endpoints (no pre-existing session)
    $is_csrf_exempt = ($first_segment === 'auth' && in_array($second_segment, ['login', 'setup', 'set-password', 'forgot-password'], true));
    if (!$is_csrf_exempt && ($token === '' || !hash_equals((string) $session_token, (string) $token))) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'data' => null, 'errors' => ['Jeton CSRF invalide.']]);
        exit;
    }
}

// Build user context
// Pour les visiteurs non connectés, charger les permissions du rôle Visiteur depuis la DB.
$visitor_permissions = [];
if (!isset($_SESSION['permissions'])) {
    $vp_stmt = $pdo->prepare(
        'SELECT p.code FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         WHERE rp.role_id = :role_id'
    );
    $vp_stmt->execute(['role_id' => ROLE_VISITEUR]);
    $visitor_permissions = $vp_stmt->fetchAll(PDO::FETCH_COLUMN);
    if (!$visitor_permissions) {
        $visitor_permissions = ['corpus.read']; // fallback si le rôle Visiteur n'a aucune permission
    }
}

$ctx = [
    'user_id'         => $_SESSION['user_id'] ?? null,
    'role_id'         => $_SESSION['role_id'] ?? ROLE_VISITEUR,
    'permissions'     => $_SESSION['permissions'] ?? $visitor_permissions,
    'include_deleted' => false,
];

// Route
require_once __DIR__ . '/router.php';
route($pdo, $ctx);
