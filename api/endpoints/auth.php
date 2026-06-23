<?php

declare(strict_types=1);

// Auth endpoint — CSRF token + session info.
// Full login/logout implementation in T07 (Phase 6.2).

require_once dirname(__DIR__) . '/dal/users.php';

function endpoint_auth(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $action === 'csrf' => _auth_csrf(),
        $method === 'GET' && $action === 'me'   => _auth_me($ctx),
        default => dal_error('Méthode non supportée.'),
    };
}

function _auth_csrf(): array
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return dal_ok(['csrf_token' => $_SESSION['csrf_token']]);
}

function _auth_me(array $ctx): array
{
    if ($ctx['user_id'] === null) {
        return dal_ok(null);
    }
    return dal_ok([
        'user_id' => $ctx['user_id'],
        'role_id' => $ctx['role_id'],
    ]);
}
