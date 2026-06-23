<?php

declare(strict_types=1);

// Session config
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', '1');
ini_set('session.cookie_samesite', 'Lax');
session_start();

// Load config (outside repo)
$config = require dirname(__DIR__) . '/config/config.php';
date_default_timezone_set($config['timezone'] ?? 'Europe/Paris');

// PDO
require_once __DIR__ . '/dal/core.php';
$pdo = dal_get_pdo($config);

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

// CSRF check on mutations
if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'DELETE'], true)) {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $session_token = $_SESSION['csrf_token'] ?? '';
    // Skip CSRF for login endpoint
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (!str_ends_with($uri, '/auth/login') && ($token === '' || $token !== $session_token)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'data' => null, 'errors' => ['Jeton CSRF invalide.']]);
        exit;
    }
}

// Build user context
$ctx = [
    'user_id'         => $_SESSION['user_id'] ?? null,
    'role_id'         => $_SESSION['role_id'] ?? ROLE_VISITEUR,
    'permissions'     => $_SESSION['permissions'] ?? ['corpus.read'],
    'include_deleted' => false,
];

// JSON output
header('Content-Type: application/json; charset=utf-8');

// Route
require_once __DIR__ . '/router.php';
route($pdo, $ctx);
