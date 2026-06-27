<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

function dal_get_user_favorites(PDO $pdo, array $ctx, ?string $cursor = null, int $page_size = PAGE_SIZE_DEFAULT): array
{
    dal_require_permission($ctx, 'corpus.read');
    if ($ctx['user_id'] === null) {
        return dal_error('Connexion requise pour les favoris.');
    }

    $params = [':user_id' => $ctx['user_id']];
    $where = 'uf.user_id = :user_id';
    $where .= dal_soft_delete_clause('c', $ctx);
    $where .= dal_oeuvre_access_clause('c.oeuvre_id', $ctx, $params);

    $decoded_cursor = dal_decode_cursor($cursor);
    $where .= dal_keyset_clause('uf.created_at', 'c.id', $decoded_cursor, 'DESC', $params);

    $limit = $page_size + 1;
    $sql = "SELECT c.id, c.contenu, c.auteur_nom, c.date_entree, o.nom AS oeuvre_nom,
                   e.nom AS etat_nom, uf.created_at AS favorited_at
            FROM user_favorites uf
            JOIN citations c ON uf.citation_id = c.id
            JOIN oeuvres o ON c.oeuvre_id = o.id
            JOIN etats e ON c.etat_id = e.id
            WHERE {$where}
            ORDER BY uf.created_at DESC, c.id DESC
            LIMIT {$limit}";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $has_next = count($rows) > $page_size;
    if ($has_next) {
        array_pop($rows);
    }
    $next_cursor = null;
    if ($has_next && !empty($rows)) {
        $last = end($rows);
        $next_cursor = dal_encode_cursor($last['favorited_at'], (int) $last['id']);
    }
    return dal_ok(['items' => $rows, 'next_cursor' => $next_cursor]);
}

function dal_add_favorite(PDO $pdo, array $ctx, int $citation_id): array
{
    dal_require_permission($ctx, 'corpus.read');
    if ($ctx['user_id'] === null) {
        return dal_error('Connexion requise pour les favoris.');
    }
    try {
        $stmt = $pdo->prepare('INSERT INTO user_favorites (user_id, citation_id) VALUES (:uid, :cid)');
        $stmt->execute(['uid' => $ctx['user_id'], 'cid' => $citation_id]);
        return dal_ok();
    } catch (\PDOException $e) {
        if ($e->getCode() === '23000') {
            return dal_ok(); // already a favorite, idempotent
        }
        throw $e;
    }
}

function dal_remove_favorite(PDO $pdo, array $ctx, int $citation_id): array
{
    dal_require_permission($ctx, 'corpus.read');
    if ($ctx['user_id'] === null) {
        return dal_error('Connexion requise pour les favoris.');
    }
    $stmt = $pdo->prepare('DELETE FROM user_favorites WHERE user_id = :uid AND citation_id = :cid');
    $stmt->execute(['uid' => $ctx['user_id'], 'cid' => $citation_id]);
    return dal_ok();
}
