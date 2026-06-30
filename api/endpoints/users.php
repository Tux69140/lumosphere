<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/users.php';
require_once dirname(__DIR__) . '/lib/mailer.php';
require_once dirname(__DIR__) . '/templates/mail_invite.php';

function endpoint_users(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    return match (true) {
        $method === 'GET' && $id === null  => dal_find_users($pdo, $ctx),
        $method === 'GET' && $id !== null  => dal_get_user($pdo, $ctx, $id),
        $method === 'POST' && $id === null => _users_create($pdo, $ctx, $body ?? [], $ip),
        $method === 'PUT' && $id !== null  => dal_update_user($pdo, $ctx, $id, $body ?? []),
        $method === 'DELETE' && $id !== null => dal_delete_user($pdo, $ctx, $id),
        $method === 'POST' && $action === 'resend-invite' && $id !== null
            => _users_resend_invite($pdo, $ctx, $id, $ip),
        default => dal_error('Méthode non supportée.'),
    };
}

function _users_create(PDO $pdo, array $ctx, array $body, string $ip): array
{
    $result = dal_create_user($pdo, $ctx, $body, $ip);
    if ($result['status'] !== 'ok') {
        return $result;
    }

    $user_id = (int) $result['data']['id'];
    $token   = $result['data']['invite_token'];

    $stmt = $pdo->prepare('SELECT prenom, nom, email FROM users WHERE id = :id');
    $stmt->execute(['id' => $user_id]);
    $user = $stmt->fetch();

    $origin  = $GLOBALS['app_config']['allowed_origin'] ?? '';
    $set_url = "{$origin}/definir-mot-de-passe?token={$token}";
    $tpl     = mail_template_invite($user['prenom'], $set_url);

    send_mail($user['email'], "{$user['prenom']} {$user['nom']}", $tpl['subject'], $tpl['html'], $tpl['text']);

    return dal_ok(['id' => $user_id]);
}

function _users_resend_invite(PDO $pdo, array $ctx, int $user_id, string $ip): array
{
    $result = dal_resend_invite($pdo, $ctx, $user_id, $ip);
    if ($result['status'] !== 'ok') {
        return $result;
    }

    $user  = $result['data']['user'];
    $token = $result['data']['invite_token'];

    $origin  = $GLOBALS['app_config']['allowed_origin'] ?? '';
    $set_url = "{$origin}/definir-mot-de-passe?token={$token}";
    $tpl     = mail_template_invite($user['prenom'], $set_url);

    send_mail($user['email'], "{$user['prenom']} {$user['nom']}", $tpl['subject'], $tpl['html'], $tpl['text']);

    return dal_ok(['message' => 'Invitation renvoyée.']);
}
