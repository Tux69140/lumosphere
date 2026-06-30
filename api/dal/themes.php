<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

function dal_find_themes(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'corpus.read');
    $rows = $pdo->query(
        'SELECT id, nom, parent_id, chemin, description, created_at, updated_at
         FROM themes ORDER BY chemin, nom'
    )->fetchAll();
    return dal_ok($rows);
}

function dal_get_theme(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'corpus.read');
    $stmt = $pdo->prepare(
        'SELECT id, nom, parent_id, chemin, description, created_at, updated_at FROM themes WHERE id = :id'
    );
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        return dal_error('Thème introuvable.');
    }
    return dal_ok($row);
}

/**
 * R5 — Themes max 2 levels. Chemin computed in PHP.
 */
function dal_create_theme(PDO $pdo, array $ctx, array $data): array
{
    dal_require_permission($ctx, 'themes.manage');
    $nom = trim($data['nom'] ?? '');
    if ($nom === '') {
        return dal_error('Le nom du thème est requis.');
    }
    $parent_id = $data['parent_id'] ?? null;

    if ($parent_id !== null) {
        $parent_id = (int) $parent_id;
        $stmt = $pdo->prepare('SELECT id, parent_id FROM themes WHERE id = :id');
        $stmt->execute(['id' => $parent_id]);
        $parent = $stmt->fetch();
        if (!$parent) {
            return dal_error('Thème parent introuvable.');
        }
        if ($parent['parent_id'] !== null) {
            return dal_error('Profondeur maximale atteinte (2 niveaux). Ce thème a déjà un parent.');
        }
    }

    $chemin = _dal_compute_chemin($pdo, $parent_id, $nom);
    $stmt = $pdo->prepare(
        'INSERT INTO themes (nom, parent_id, chemin, description) VALUES (:nom, :parent_id, :chemin, :description)'
    );
    $stmt->execute([
        'nom'         => $nom,
        'parent_id'   => $parent_id,
        'chemin'      => $chemin,
        'description' => $data['description'] ?? null,
    ]);
    return dal_ok(['id' => (int) $pdo->lastInsertId()]);
}

/**
 * R5 — Update with depth check + chemin cascade.
 */
function dal_update_theme(PDO $pdo, array $ctx, int $id, array $data): array
{
    dal_require_permission($ctx, 'themes.manage');

    $stmt = $pdo->prepare('SELECT id, nom, parent_id FROM themes WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $current = $stmt->fetch();
    if (!$current) {
        return dal_error('Thème introuvable.');
    }

    $nom = trim($data['nom'] ?? $current['nom']);
    $parent_id = array_key_exists('parent_id', $data) ? $data['parent_id'] : $current['parent_id'];
    if ($parent_id !== null) {
        $parent_id = (int) $parent_id;
    }

    if ($parent_id !== null && $parent_id !== (int) ($current['parent_id'] ?? 0)) {
        if ($parent_id === $id) {
            return dal_error('Un thème ne peut pas être son propre parent.');
        }
        $stmt = $pdo->prepare('SELECT parent_id FROM themes WHERE id = :id');
        $stmt->execute(['id' => $parent_id]);
        $parent = $stmt->fetch();
        if (!$parent) {
            return dal_error('Thème parent introuvable.');
        }
        if ($parent['parent_id'] !== null) {
            return dal_error('Profondeur maximale atteinte (2 niveaux). Ce thème a déjà un parent.');
        }
        // If this theme has children, it cannot become a child itself
        $stmt = $pdo->prepare('SELECT COUNT(*) AS cnt FROM themes WHERE parent_id = :id');
        $stmt->execute(['id' => $id]);
        if ((int) $stmt->fetch()['cnt'] > 0) {
            return dal_error('Ce thème a des sous-thèmes. Il ne peut pas devenir un sous-thème lui-même.');
        }
    }

    $chemin = _dal_compute_chemin($pdo, $parent_id, $nom);

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'UPDATE themes SET nom = :nom, parent_id = :parent_id, chemin = :chemin, description = :description
             WHERE id = :id'
        );
        $stmt->execute([
            'nom'         => $nom,
            'parent_id'   => $parent_id,
            'chemin'      => $chemin,
            'description' => $data['description'] ?? $current['description'] ?? null,
            'id'          => $id,
        ]);

        // Cascade chemin to children
        $stmt = $pdo->prepare("UPDATE themes SET chemin = CONCAT(:parent_nom, '/', nom) WHERE parent_id = :parent_id");
        $stmt->execute(['parent_nom' => $nom, 'parent_id' => $id]);

        $pdo->commit();
        return dal_ok(['id' => $id]);
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function dal_delete_theme(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'themes.manage');
    $stmt = $pdo->prepare('DELETE FROM themes WHERE id = :id');
    $stmt->execute(['id' => $id]);
    return $stmt->rowCount() > 0 ? dal_ok() : dal_error('Thème introuvable.');
}

function _dal_compute_chemin(PDO $pdo, ?int $parent_id, string $nom): string
{
    if ($parent_id === null) {
        return $nom;
    }
    $stmt = $pdo->prepare('SELECT nom FROM themes WHERE id = :id');
    $stmt->execute(['id' => $parent_id]);
    $parent = $stmt->fetch();
    return $parent ? $parent['nom'] . '/' . $nom : $nom;
}
