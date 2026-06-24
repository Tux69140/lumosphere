<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

/**
 * Attach keywords (mots_cles: [{id, mot}]) to a list of citation rows.
 * Single batch query to avoid N+1.
 */
function dal_attach_keywords(PDO $pdo, array $rows): array
{
    if (empty($rows)) {
        return $rows;
    }
    $ids = array_map('intval', array_column($rows, 'id'));
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare(
        "SELECT ck.citation_id, k.id, k.mot
         FROM keywords k
         JOIN citation_keywords ck ON ck.keyword_id = k.id
         WHERE ck.citation_id IN ({$placeholders})
         ORDER BY k.mot"
    );
    $stmt->execute($ids);
    $by_citation = [];
    foreach ($stmt->fetchAll() as $kw) {
        $by_citation[(int) $kw['citation_id']][] = ['id' => (int) $kw['id'], 'mot' => $kw['mot']];
    }
    foreach ($rows as &$row) {
        $row['mots_cles'] = $by_citation[(int) $row['id']] ?? [];
    }
    unset($row);
    return $rows;
}

/**
 * Read citations with R7 (soft-delete), R8 (oeuvre access), R9 (keyset pagination).
 */
function dal_find_citations(PDO $pdo, array $ctx, array $filters = [], ?string $cursor = null, int $page_size = PAGE_SIZE_DEFAULT): array
{
    dal_require_permission($ctx, 'corpus.read');
    $params = [];
    $where = '1=1';

    $where .= dal_soft_delete_clause('c', $ctx);
    $where .= dal_oeuvre_access_clause('c.oeuvre_id', $ctx, $params);

    if (!empty($filters['oeuvre_id'])) {
        $where .= ' AND c.oeuvre_id = :f_oeuvre_id';
        $params[':f_oeuvre_id'] = (int) $filters['oeuvre_id'];
    }
    if (!empty($filters['theme_id'])) {
        $where .= ' AND c.theme_id = :f_theme_id';
        $params[':f_theme_id'] = (int) $filters['theme_id'];
    }
    if (!empty($filters['etat_id'])) {
        $where .= ' AND c.etat_id = :f_etat_id';
        $params[':f_etat_id'] = (int) $filters['etat_id'];
    }
    if (!empty($filters['auteur_id'])) {
        $where .= ' AND o.auteur_id = :f_auteur_id';
        $params[':f_auteur_id'] = (int) $filters['auteur_id'];
    }
    if (!empty($filters['date_from'])) {
        $where .= ' AND c.date_entree >= :f_date_from';
        $params[':f_date_from'] = $filters['date_from'];
    }
    if (!empty($filters['date_to'])) {
        $where .= ' AND c.date_entree <= :f_date_to';
        $params[':f_date_to'] = $filters['date_to'];
    }

    // Keyword filter (OR / AND mode)
    if (!empty($filters['keyword_ids']) && is_array($filters['keyword_ids'])) {
        $kw_ids = array_map('intval', $filters['keyword_ids']);
        $placeholders = [];
        foreach ($kw_ids as $i => $kid) {
            $key = ":kw_{$i}";
            $placeholders[] = $key;
            $params[$key] = $kid;
        }
        $in_list = implode(',', $placeholders);
        $mode = ($filters['keyword_mode'] ?? 'or') === 'and' ? 'and' : 'or';
        if ($mode === 'or') {
            $where .= " AND c.id IN (SELECT citation_id FROM citation_keywords WHERE keyword_id IN ({$in_list}))";
        } else {
            $where .= " AND c.id IN (SELECT citation_id FROM citation_keywords WHERE keyword_id IN ({$in_list}) GROUP BY citation_id HAVING COUNT(DISTINCT keyword_id) = :kw_count)";
            $params[':kw_count'] = count($kw_ids);
        }
    }

    $decoded_cursor = dal_decode_cursor($cursor);
    $where .= dal_keyset_clause('c.date_entree', 'c.id', $decoded_cursor, 'DESC', $params);

    $limit = $page_size + 1;
    $sql = "SELECT c.id, c.contenu, c.notes, c.oeuvre_id, c.theme_id, c.etat_id,
                   c.auteur_nom, c.date_entree, c.deleted_at, c.created_at, c.updated_at,
                   o.nom AS oeuvre_nom, t.nom AS theme_nom, e.nom AS etat_nom
            FROM citations c
            JOIN oeuvres o ON c.oeuvre_id = o.id
            LEFT JOIN themes t ON c.theme_id = t.id
            JOIN etats e ON c.etat_id = e.id
            WHERE {$where}
            ORDER BY c.date_entree DESC, c.id DESC
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
        $next_cursor = dal_encode_cursor($last['date_entree'], (int) $last['id']);
    }
    return dal_ok(['items' => dal_attach_keywords($pdo, $rows), 'next_cursor' => $next_cursor]);
}

function dal_get_citation(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'corpus.read');
    $params = [':id' => $id];
    $where = 'c.id = :id';
    $where .= dal_soft_delete_clause('c', $ctx);
    $where .= dal_oeuvre_access_clause('c.oeuvre_id', $ctx, $params);

    $sql = "SELECT c.*, o.nom AS oeuvre_nom, a.nom AS auteur_nom_join, t.nom AS theme_nom, e.nom AS etat_nom
            FROM citations c
            JOIN oeuvres o ON c.oeuvre_id = o.id
            JOIN auteurs a ON o.auteur_id = a.id
            LEFT JOIN themes t ON c.theme_id = t.id
            JOIN etats e ON c.etat_id = e.id
            WHERE {$where}";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $stmt->execute();
    $row = $stmt->fetch();
    if (!$row) {
        return dal_error('Citation introuvable.');
    }

    // Attach keywords
    $kw_stmt = $pdo->prepare(
        'SELECT k.id, k.mot FROM keywords k JOIN citation_keywords ck ON ck.keyword_id = k.id WHERE ck.citation_id = :cid ORDER BY k.mot'
    );
    $kw_stmt->execute(['cid' => $id]);
    $row['keywords'] = $kw_stmt->fetchAll();

    return dal_ok($row);
}

function dal_count_citations(PDO $pdo, array $ctx, array $filters = []): array
{
    dal_require_permission($ctx, 'corpus.read');
    $params = [];
    $where = '1=1';
    $where .= dal_soft_delete_clause('c', $ctx);
    $where .= dal_oeuvre_access_clause('c.oeuvre_id', $ctx, $params);

    if (!empty($filters['oeuvre_id'])) {
        $where .= ' AND c.oeuvre_id = :f_oeuvre_id';
        $params[':f_oeuvre_id'] = (int) $filters['oeuvre_id'];
    }
    if (!empty($filters['etat_id'])) {
        $where .= ' AND c.etat_id = :f_etat_id';
        $params[':f_etat_id'] = (int) $filters['etat_id'];
    }

    $sql = "SELECT COUNT(*) AS total FROM citations c WHERE {$where}";
    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v, is_int($v) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    $stmt->execute();
    return dal_ok(['total' => (int) $stmt->fetch()['total']]);
}

/**
 * FULLTEXT search with R7, R8, R9.
 */
function dal_search_citations(PDO $pdo, array $ctx, string $query, array $filters = [], ?string $cursor = null, int $page_size = PAGE_SIZE_DEFAULT): array
{
    dal_require_permission($ctx, 'corpus.read');
    $query = trim($query);
    if ($query === '') {
        return dal_find_citations($pdo, $ctx, $filters, $cursor, $page_size);
    }

    $params = [':ft_query' => $query, ':ft_query2' => $query];
    $where = 'MATCH(c.contenu, c.notes, c.auteur_nom) AGAINST(:ft_query IN BOOLEAN MODE)';
    $where .= dal_soft_delete_clause('c', $ctx);
    $where .= dal_oeuvre_access_clause('c.oeuvre_id', $ctx, $params);

    if (!empty($filters['oeuvre_id'])) {
        $where .= ' AND c.oeuvre_id = :f_oeuvre_id';
        $params[':f_oeuvre_id'] = (int) $filters['oeuvre_id'];
    }
    if (!empty($filters['theme_id'])) {
        $where .= ' AND c.theme_id = :f_theme_id';
        $params[':f_theme_id'] = (int) $filters['theme_id'];
    }
    if (!empty($filters['etat_id'])) {
        $where .= ' AND c.etat_id = :f_etat_id';
        $params[':f_etat_id'] = (int) $filters['etat_id'];
    }
    if (!empty($filters['auteur_id'])) {
        $where .= ' AND o.auteur_id = :f_auteur_id';
        $params[':f_auteur_id'] = (int) $filters['auteur_id'];
    }
    if (!empty($filters['date_from'])) {
        $where .= ' AND c.date_entree >= :f_date_from';
        $params[':f_date_from'] = $filters['date_from'];
    }
    if (!empty($filters['date_to'])) {
        $where .= ' AND c.date_entree <= :f_date_to';
        $params[':f_date_to'] = $filters['date_to'];
    }

    if (!empty($filters['keyword_ids']) && is_array($filters['keyword_ids'])) {
        $kw_ids = array_map('intval', $filters['keyword_ids']);
        $placeholders = [];
        foreach ($kw_ids as $i => $kid) {
            $key = ":kw_{$i}";
            $placeholders[] = $key;
            $params[$key] = $kid;
        }
        $in_list = implode(',', $placeholders);
        $mode = ($filters['keyword_mode'] ?? 'or') === 'and' ? 'and' : 'or';
        if ($mode === 'or') {
            $where .= " AND c.id IN (SELECT citation_id FROM citation_keywords WHERE keyword_id IN ({$in_list}))";
        } else {
            $where .= " AND c.id IN (SELECT citation_id FROM citation_keywords WHERE keyword_id IN ({$in_list}) GROUP BY citation_id HAVING COUNT(DISTINCT keyword_id) = :kw_count)";
            $params[':kw_count'] = count($kw_ids);
        }
    }

    $decoded_cursor = dal_decode_cursor($cursor);
    $where .= dal_keyset_clause('c.date_entree', 'c.id', $decoded_cursor, 'DESC', $params);

    $limit = $page_size + 1;
    $sql = "SELECT c.id, c.contenu, c.notes, c.oeuvre_id, c.theme_id, c.etat_id,
                   c.auteur_nom, c.date_entree, c.created_at, c.updated_at,
                   o.nom AS oeuvre_nom, t.nom AS theme_nom, e.nom AS etat_nom,
                   MATCH(c.contenu, c.notes, c.auteur_nom) AGAINST(:ft_query2 IN BOOLEAN MODE) AS relevance
            FROM citations c
            JOIN oeuvres o ON c.oeuvre_id = o.id
            LEFT JOIN themes t ON c.theme_id = t.id
            JOIN etats e ON c.etat_id = e.id
            WHERE {$where}
            ORDER BY c.date_entree DESC, c.id DESC
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
        $next_cursor = dal_encode_cursor($last['date_entree'], (int) $last['id']);
    }
    return dal_ok(['items' => dal_attach_keywords($pdo, $rows), 'next_cursor' => $next_cursor]);
}

/**
 * R1 — Default state = À Corriger. Always forced on creation.
 */
function dal_create_citation(PDO $pdo, array $ctx, array $data): array
{
    dal_require_permission($ctx, 'corpus.write');
    $contenu = trim($data['contenu'] ?? '');
    if ($contenu === '') {
        return dal_error('Le contenu est requis.');
    }
    if (empty($data['oeuvre_id'])) {
        return dal_error('L\'œuvre est requise.');
    }

    $auteur_nom = _dal_resolve_auteur_nom($pdo, (int) $data['oeuvre_id']);

    $stmt = $pdo->prepare(
        'INSERT INTO citations (contenu, notes, oeuvre_id, theme_id, etat_id, auteur_nom,
                                telegram_message_id, import_source_id, source_item_id, source_item_date, date_entree)
         VALUES (:contenu, :notes, :oeuvre_id, :theme_id, :etat_id, :auteur_nom,
                 :telegram_message_id, :import_source_id, :source_item_id, :source_item_date, :date_entree)'
    );
    $stmt->execute([
        'contenu'              => $contenu,
        'notes'                => $data['notes'] ?? null,
        'oeuvre_id'            => (int) $data['oeuvre_id'],
        'theme_id'             => isset($data['theme_id']) ? (int) $data['theme_id'] : null,
        'etat_id'              => ETAT_A_CORRIGER, // R1
        'auteur_nom'           => $auteur_nom,
        'telegram_message_id'  => $data['telegram_message_id'] ?? null,
        'import_source_id'     => isset($data['import_source_id']) ? (int) $data['import_source_id'] : null,
        'source_item_id'       => $data['source_item_id'] ?? null,
        'source_item_date'     => $data['source_item_date'] ?? null,
        'date_entree'          => $data['date_entree'] ?? date('Y-m-d'),
    ]);
    return dal_ok(['id' => (int) $pdo->lastInsertId()]);
}

/**
 * R2 + R10 — Update with publication validation + concurrent edit lock.
 */
function dal_update_citation(PDO $pdo, array $ctx, int $id, array $data): array
{
    dal_require_permission($ctx, 'corpus.write');

    $pdo->beginTransaction();
    try {
        // R10 — concurrent edit lock
        $pdo->exec('SET innodb_lock_wait_timeout = 5');
        $stmt = $pdo->prepare(
            'SELECT id, oeuvre_id, theme_id, etat_id, date_entree, deleted_at FROM citations WHERE id = :id FOR UPDATE'
        );
        $stmt->execute(['id' => $id]);
        $current = $stmt->fetch();
        if (!$current) {
            $pdo->rollBack();
            return dal_error('Citation introuvable.');
        }
        if ($current['deleted_at'] !== null) {
            $pdo->rollBack();
            return dal_error('Cette citation est supprimée.');
        }

        // R2 — validate if transitioning to Publiée
        $new_etat = isset($data['etat_id']) ? (int) $data['etat_id'] : (int) $current['etat_id'];
        if ($new_etat === ETAT_PUBLIEE) {
            $merged = array_merge($current, $data);
            $missing = _dal_validate_can_publish($pdo, $id, $merged);
            if (!empty($missing)) {
                $pdo->rollBack();
                return dal_error('Publication impossible. Champs manquants : ' . implode(', ', $missing));
            }
        }

        // Build dynamic UPDATE
        $fields = [];
        $params = ['id' => $id];
        $allowed = ['contenu', 'notes', 'oeuvre_id', 'theme_id', 'etat_id', 'date_entree'];
        foreach ($allowed as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "{$col} = :{$col}";
                $params[$col] = $data[$col];
            }
        }

        // Update auteur_nom if oeuvre_id changes
        if (isset($data['oeuvre_id']) && (int) $data['oeuvre_id'] !== (int) $current['oeuvre_id']) {
            $auteur_nom = _dal_resolve_auteur_nom($pdo, (int) $data['oeuvre_id']);
            $fields[] = 'auteur_nom = :auteur_nom';
            $params['auteur_nom'] = $auteur_nom;
        }

        if (empty($fields)) {
            $pdo->commit();
            return dal_ok(['id' => $id]);
        }

        $sql = 'UPDATE citations SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $pdo->prepare($sql)->execute($params);
        $pdo->commit();
        return dal_ok(['id' => $id]);
    } catch (\PDOException $e) {
        $pdo->rollBack();
        if (str_contains($e->getMessage(), 'Lock wait timeout')) {
            return dal_error('Cette citation est en cours d\'édition par un autre utilisateur.');
        }
        throw $e;
    }
}

/**
 * R7 — Soft-delete: set deleted_at.
 */
function dal_soft_delete_citation(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'corpus.delete');
    $stmt = $pdo->prepare('UPDATE citations SET deleted_at = NOW() WHERE id = :id AND deleted_at IS NULL');
    $stmt->execute(['id' => $id]);
    return $stmt->rowCount() > 0 ? dal_ok() : dal_error('Citation introuvable ou déjà supprimée.');
}

/**
 * R7 — Restore: admin only.
 */
function dal_restore_citation(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'corpus.delete');
    if ($ctx['role_id'] !== ROLE_ADMIN) {
        return dal_error('Seul un administrateur peut restaurer une citation.');
    }
    $stmt = $pdo->prepare('UPDATE citations SET deleted_at = NULL WHERE id = :id AND deleted_at IS NOT NULL');
    $stmt->execute(['id' => $id]);
    return $stmt->rowCount() > 0 ? dal_ok() : dal_error('Citation introuvable ou non supprimée.');
}

/**
 * Set keywords for a citation (replace all).
 */
function dal_set_citation_keywords(PDO $pdo, array $ctx, int $citation_id, array $keyword_ids): array
{
    dal_require_permission($ctx, 'corpus.write');
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM citation_keywords WHERE citation_id = :cid')
            ->execute(['cid' => $citation_id]);
        $stmt = $pdo->prepare('INSERT INTO citation_keywords (citation_id, keyword_id) VALUES (:cid, :kid)');
        foreach ($keyword_ids as $kid) {
            $stmt->execute(['cid' => $citation_id, 'kid' => (int) $kid]);
        }
        $pdo->commit();
        return dal_ok();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        return dal_error('Erreur lors de l\'association des mots-clés.');
    }
}

// --- Private helpers ---

function _dal_resolve_auteur_nom(PDO $pdo, int $oeuvre_id): ?string
{
    $stmt = $pdo->prepare('SELECT a.nom FROM auteurs a JOIN oeuvres o ON o.auteur_id = a.id WHERE o.id = :oid');
    $stmt->execute(['oid' => $oeuvre_id]);
    $row = $stmt->fetch();
    return $row ? $row['nom'] : null;
}

/**
 * R2 — Validate that a citation can transition to Publiée.
 * Returns array of missing field names, or empty array if OK.
 */
function _dal_validate_can_publish(PDO $pdo, int $citation_id, array $data): array
{
    $missing = [];

    $theme_id = $data['theme_id'] ?? null;
    if ($theme_id === null || (string) $theme_id === '') {
        $missing[] = 'theme';
    }

    $date_entree = $data['date_entree'] ?? null;
    if ($date_entree === null || (string) $date_entree === '') {
        $missing[] = 'date_entree';
    }

    // auteur is always present via oeuvre_id NOT NULL → auteurs FK

    // At least 1 keyword
    $stmt = $pdo->prepare('SELECT COUNT(*) AS cnt FROM citation_keywords WHERE citation_id = :id');
    $stmt->execute(['id' => $citation_id]);
    if ((int) $stmt->fetch()['cnt'] === 0) {
        $missing[] = 'keywords';
    }

    return $missing;
}
