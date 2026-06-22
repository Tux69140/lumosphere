<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

function dal_find_auteurs(PDO $pdo, array $ctx, ?string $search = null): array
{
    dal_require_permission($ctx, 'corpus.read');
    if ($search !== null && $search !== '') {
        $stmt = $pdo->prepare('SELECT id, nom, site, informations, created_at, updated_at FROM auteurs WHERE nom LIKE :search ORDER BY nom');
        $stmt->execute(['search' => '%' . $search . '%']);
    } else {
        $stmt = $pdo->prepare('SELECT id, nom, site, informations, created_at, updated_at FROM auteurs ORDER BY nom');
        $stmt->execute();
    }
    return dal_ok($stmt->fetchAll());
}

function dal_get_auteur(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'corpus.read');
    $stmt = $pdo->prepare('SELECT id, nom, site, informations, created_at, updated_at FROM auteurs WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ? dal_ok($row) : dal_error('Auteur introuvable.');
}

function dal_create_auteur(PDO $pdo, array $ctx, array $data): array
{
    dal_require_permission($ctx, 'oeuvres.manage');
    $nom = trim($data['nom'] ?? '');
    if ($nom === '') {
        return dal_error('Le nom de l\'auteur est requis.');
    }
    $stmt = $pdo->prepare('INSERT INTO auteurs (nom, site, informations) VALUES (:nom, :site, :informations)');
    $stmt->execute([
        'nom'          => $nom,
        'site'         => $data['site'] ?? null,
        'informations' => $data['informations'] ?? null,
    ]);
    return dal_ok(['id' => (int) $pdo->lastInsertId()]);
}

function dal_update_auteur(PDO $pdo, array $ctx, int $id, array $data): array
{
    dal_require_permission($ctx, 'oeuvres.manage');
    $stmt = $pdo->prepare('SELECT id FROM auteurs WHERE id = :id');
    $stmt->execute(['id' => $id]);
    if (!$stmt->fetch()) {
        return dal_error('Auteur introuvable.');
    }
    $fields = [];
    $params = ['id' => $id];
    foreach (['nom', 'site', 'informations'] as $col) {
        if (array_key_exists($col, $data)) {
            $fields[] = "{$col} = :{$col}";
            $params[$col] = $data[$col];
        }
    }
    if (empty($fields)) {
        return dal_error('Aucun champ à mettre à jour.');
    }
    $sql = 'UPDATE auteurs SET ' . implode(', ', $fields) . ' WHERE id = :id';
    $pdo->prepare($sql)->execute($params);
    return dal_ok(['id' => $id]);
}

function dal_delete_auteur(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'oeuvres.manage');
    try {
        $stmt = $pdo->prepare('DELETE FROM auteurs WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0 ? dal_ok() : dal_error('Auteur introuvable.');
    } catch (\PDOException $e) {
        if ($e->getCode() === '23000') {
            return dal_error('Cet auteur a des œuvres liées. Supprimez-les d\'abord.');
        }
        throw $e;
    }
}
