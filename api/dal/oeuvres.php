<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

function dal_find_oeuvres(PDO $pdo, array $ctx, ?int $auteur_id = null): array
{
    dal_require_permission($ctx, 'corpus.read');
    $params = [];
    $where = '1=1';

    if ($auteur_id !== null) {
        $where .= ' AND o.auteur_id = :auteur_id';
        $params['auteur_id'] = $auteur_id;
    }

    $where .= dal_oeuvre_visibility_clause('o.id', $ctx, $params);

    $sql = "SELECT o.id, o.auteur_id, o.nom, o.abreviation, o.url, o.ref_libraire, o.description,
                   o.created_at, o.updated_at, a.nom AS auteur_nom
            FROM oeuvres o
            JOIN auteurs a ON o.auteur_id = a.id
            WHERE {$where}
            ORDER BY o.nom";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return dal_ok($stmt->fetchAll());
}

function dal_get_oeuvre(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'corpus.read');
    $stmt = $pdo->prepare(
        'SELECT o.id, o.auteur_id, o.nom, o.abreviation, o.url, o.ref_libraire, o.description,
                o.created_at, o.updated_at, a.nom AS auteur_nom
         FROM oeuvres o
         JOIN auteurs a ON o.auteur_id = a.id
         WHERE o.id = :id'
    );
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ? dal_ok($row) : dal_error('Œuvre introuvable.');
}

function dal_create_oeuvre(PDO $pdo, array $ctx, array $data): array
{
    dal_require_permission($ctx, 'oeuvres.manage');
    $nom = trim($data['nom'] ?? '');
    if ($nom === '') {
        return dal_error('Le nom de l\'œuvre est requis.');
    }
    if (empty($data['auteur_id'])) {
        return dal_error('L\'auteur est requis.');
    }
    $stmt = $pdo->prepare(
        'INSERT INTO oeuvres (auteur_id, nom, abreviation, url, ref_libraire, description)
         VALUES (:auteur_id, :nom, :abreviation, :url, :ref_libraire, :description)'
    );
    $stmt->execute([
        'auteur_id'    => (int) $data['auteur_id'],
        'nom'          => $nom,
        'abreviation'  => $data['abreviation'] ?? null,
        'url'          => $data['url'] ?? null,
        'ref_libraire' => $data['ref_libraire'] ?? null,
        'description'  => $data['description'] ?? null,
    ]);
    return dal_ok(['id' => (int) $pdo->lastInsertId()]);
}

function dal_update_oeuvre(PDO $pdo, array $ctx, int $id, array $data): array
{
    dal_require_permission($ctx, 'oeuvres.manage');
    $stmt = $pdo->prepare('SELECT id FROM oeuvres WHERE id = :id');
    $stmt->execute(['id' => $id]);
    if (!$stmt->fetch()) {
        return dal_error('Œuvre introuvable.');
    }
    $fields = [];
    $params = ['id' => $id];
    foreach (['auteur_id', 'nom', 'abreviation', 'url', 'ref_libraire', 'description'] as $col) {
        if (array_key_exists($col, $data)) {
            $fields[] = "{$col} = :{$col}";
            $params[$col] = $data[$col];
        }
    }
    if (empty($fields)) {
        return dal_error('Aucun champ à mettre à jour.');
    }
    $sql = 'UPDATE oeuvres SET ' . implode(', ', $fields) . ' WHERE id = :id';
    $pdo->prepare($sql)->execute($params);
    return dal_ok(['id' => $id]);
}

function dal_delete_oeuvre(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'oeuvres.manage');
    try {
        $stmt = $pdo->prepare('DELETE FROM oeuvres WHERE id = :id');
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0 ? dal_ok() : dal_error('Œuvre introuvable.');
    } catch (\PDOException $e) {
        if ($e->getCode() === '23000') {
            return dal_error('Cette œuvre a des citations liées. Supprimez-les d\'abord.');
        }
        throw $e;
    }
}
