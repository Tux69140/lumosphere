<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

function dal_find_etats(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'corpus.read');
    $stmt = $pdo->prepare('SELECT id, nom, code, couleur, est_modifiable FROM etats ORDER BY id');
    $stmt->execute();
    $rows = $stmt->fetchAll();
    return dal_ok($rows);
}

function dal_get_etat(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'corpus.read');
    $stmt = $pdo->prepare('SELECT id, nom, code, couleur, est_modifiable FROM etats WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        return dal_error('État introuvable.');
    }
    return dal_ok($row);
}

/**
 * R3 — System states (est_modifiable=0) cannot be deleted.
 */
function dal_delete_etat(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'admin.settings');
    $stmt = $pdo->prepare('SELECT est_modifiable FROM etats WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        return dal_error('État introuvable.');
    }
    if ((int) $row['est_modifiable'] === 0) {
        return dal_error('Les états système ne peuvent pas être supprimés.');
    }
    $pdo->prepare('DELETE FROM etats WHERE id = :id')->execute(['id' => $id]);
    return dal_ok();
}
