<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

/**
 * Crée un jeton sécurisé. Retourne le jeton brut (à envoyer par mail uniquement).
 * Le jeton brut n'est JAMAIS stocké en base — seul son hash SHA-256 l'est.
 *
 * @param int    $ttl_seconds Durée de validité en secondes (invite: 604800 = 7j, reset: 3600 = 1h)
 */
function dal_token_create(PDO $pdo, int $user_id, string $type, int $ttl_seconds, string $ip): string
{
    $raw_token = bin2hex(random_bytes(32)); // 64 hex chars
    $hash      = hash('sha256', $raw_token);
    $expires   = date('Y-m-d H:i:s', time() + $ttl_seconds);

    $stmt = $pdo->prepare(
        'INSERT INTO password_tokens (user_id, token_hash, type, expires_at, created_ip)
         VALUES (:user_id, :token_hash, :type, :expires_at, :ip)'
    );
    $stmt->execute([
        'user_id'    => $user_id,
        'token_hash' => $hash,
        'type'       => $type,
        'expires_at' => $expires,
        'ip'         => $ip,
    ]);

    return $raw_token;
}

/**
 * Trouve un jeton valide (non consommé, non expiré). Retourne null si invalide.
 *
 * @return array{id: int, user_id: int, type: string}|null
 */
function dal_token_find_valid(PDO $pdo, string $raw_token): ?array
{
    $hash = hash('sha256', $raw_token);
    $stmt = $pdo->prepare(
        'SELECT id, user_id, type FROM password_tokens
         WHERE token_hash = :hash AND used_at IS NULL AND expires_at > NOW()
         LIMIT 1'
    );
    $stmt->execute(['hash' => $hash]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * Marque un jeton comme consommé (usage unique).
 */
function dal_token_consume(PDO $pdo, int $token_id): void
{
    $pdo->prepare('UPDATE password_tokens SET used_at = NOW() WHERE id = :id')
        ->execute(['id' => $token_id]);
}

/**
 * Révoque (marque comme utilisés) tous les jetons non consommés d'un type pour un utilisateur.
 * Appelé avant d'émettre un nouveau jeton pour éviter les doublons actifs.
 */
function dal_token_revoke_user_tokens(PDO $pdo, int $user_id, string $type): void
{
    $pdo->prepare(
        'UPDATE password_tokens SET used_at = NOW()
         WHERE user_id = :user_id AND type = :type AND used_at IS NULL'
    )->execute(['user_id' => $user_id, 'type' => $type]);
}
