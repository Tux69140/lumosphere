<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

function dal_get_config(PDO $pdo, array $ctx, string $key): array
{
    dal_require_permission($ctx, 'admin.settings');
    $stmt = $pdo->prepare('SELECT valeur FROM config WHERE cle = :cle');
    $stmt->execute(['cle' => $key]);
    $row = $stmt->fetch();
    return dal_ok($row !== false ? $row['valeur'] : null);
}

function dal_set_config(PDO $pdo, array $ctx, string $key, ?string $value): array
{
    dal_require_permission($ctx, 'admin.settings');
    $stmt = $pdo->prepare(
        'INSERT INTO config (cle, valeur) VALUES (:cle, :valeur)
         ON DUPLICATE KEY UPDATE valeur = :valeur'
    );
    $stmt->execute(['cle' => $key, 'valeur' => $value]);
    return dal_ok();
}

function dal_list_config(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'admin.settings');
    $stmt = $pdo->prepare('SELECT cle, valeur FROM config ORDER BY cle');
    $stmt->execute();
    return dal_ok($stmt->fetchAll());
}
