<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

/**
 * Lecture interne d'une valeur de config (SANS contrôle de permission).
 * Réservée au code serveur (login, atelier…), jamais exposée telle quelle via l'API.
 */
function dal_config_value(PDO $pdo, string $key, ?string $default = null): ?string
{
    $stmt = $pdo->prepare('SELECT valeur FROM config WHERE cle = :cle');
    $stmt->execute(['cle' => $key]);
    $row = $stmt->fetch();
    return $row !== false ? $row['valeur'] : $default;
}

/**
 * Indique si le mode diagnostic global est actif
 * (conserve les dossiers de lots après intégration au lieu de les supprimer).
 */
function dal_is_debug_mode(PDO $pdo): bool
{
    return dal_config_value($pdo, 'mode_debug_global') === '1';
}

/**
 * Lecture d'une config via l'API admin (permission requise).
 */
function dal_get_config(PDO $pdo, array $ctx, string $key): array
{
    dal_require_permission($ctx, 'admin.settings');
    return dal_ok(dal_config_value($pdo, $key));
}

function dal_set_config(PDO $pdo, array $ctx, string $key, ?string $value): array
{
    dal_require_permission($ctx, 'admin.settings');
    // Deux placeholders nommés distincts : PDO non-émulé n'autorise pas la
    // réutilisation d'un même placeholder (sinon SQLSTATE[HY093]).
    $stmt = $pdo->prepare(
        'INSERT INTO config (cle, valeur) VALUES (:cle, :valeur)
         ON DUPLICATE KEY UPDATE valeur = :valeur_upd'
    );
    $stmt->execute(['cle' => $key, 'valeur' => $value, 'valeur_upd' => $value]);
    return dal_ok();
}

function dal_list_config(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'admin.settings');
    $stmt = $pdo->prepare('SELECT cle, valeur FROM config ORDER BY cle');
    $stmt->execute();
    return dal_ok($stmt->fetchAll());
}
