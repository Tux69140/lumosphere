<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

// ── Machine d'états ──────────────────────────────────────────────

const LOT_VALID_TRANSITIONS = [
    'en_attente'      => ['en_cours'],
    'en_cours'        => ['en_traitement'],
    'en_traitement'   => ['en_revision', 'erreur'],
    'en_revision'     => ['pret', 'a_reprendre'],
    'a_reprendre'     => ['en_cours'],
    'pret'            => ['integre', 'en_revision'],
    'erreur'          => ['en_traitement'],
    'integre'         => [],
];

function dal_is_valid_lot_transition(string $from, string $to): bool
{
    return in_array($to, LOT_VALID_TRANSITIONS[$from] ?? [], true);
}

// ── Lecture ───────────────────────────────────────────────────────

function dal_find_lots(PDO $pdo, array $ctx, array $filters = [], ?string $cursor = null, int $page_size = PAGE_SIZE_DEFAULT): array
{
    dal_require_permission($ctx, 'atelier.access');
    $params = [];
    $where = '1=1';

    if (!empty($filters['source_type'])) {
        $where .= ' AND l.source_type = :f_source';
        $params[':f_source'] = $filters['source_type'];
    }
    if (!empty($filters['status'])) {
        $where .= ' AND l.status = :f_status';
        $params[':f_status'] = $filters['status'];
    }
    if (!empty($filters['assigned_to'])) {
        $where .= ' AND l.assigned_to = :f_assigned';
        $params[':f_assigned'] = (int) $filters['assigned_to'];
    }
    if (!empty($filters['my_lots']) && !empty($ctx['user_id'])) {
        $where .= ' AND l.assigned_to = :f_me';
        $params[':f_me'] = (int) $ctx['user_id'];
    }
    if (!empty($filters['date_from'])) {
        $where .= ' AND l.created_at >= :f_date_from';
        $params[':f_date_from'] = $filters['date_from'];
    }
    if (!empty($filters['date_to'])) {
        $where .= ' AND l.created_at <= :f_date_to';
        $params[':f_date_to'] = $filters['date_to'] . ' 23:59:59';
    }

    $decoded_cursor = dal_decode_cursor($cursor);
    $where .= dal_keyset_clause('l.created_at', 'l.id', $decoded_cursor, 'DESC', $params);

    $limit = $page_size + 1;
    $sql = "SELECT l.id, l.lot_id, l.source_type, l.status, l.titre_lot AS nom,
                   l.assigned_to, l.created_by, l.description, l.error_message,
                   l.date_source_debut, l.date_source_fin,
                   l.created_at, l.updated_at, l.integrated_at,
                   u_assign.email AS assigned_email,
                   u_create.email AS created_email,
                   (SELECT COUNT(*) FROM documents d WHERE d.lot_id = l.lot_id) AS document_count
            FROM lots l
            LEFT JOIN users u_assign ON l.assigned_to = u_assign.id
            LEFT JOIN users u_create ON l.created_by = u_create.id
            WHERE {$where}
            ORDER BY l.created_at DESC, l.id DESC
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
        $next_cursor = dal_encode_cursor($last['created_at'], (int) $last['id']);
    }
    return dal_ok(['items' => $rows, 'next_cursor' => $next_cursor]);
}

function dal_get_lot(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'atelier.access');

    $stmt = $pdo->prepare(
        "SELECT l.*, l.titre_lot AS nom, u_assign.email AS assigned_email, u_create.email AS created_email
         FROM lots l
         LEFT JOIN users u_assign ON l.assigned_to = u_assign.id
         LEFT JOIN users u_create ON l.created_by = u_create.id
         WHERE l.id = :id"
    );
    $stmt->execute(['id' => $id]);
    $lot = $stmt->fetch();
    if (!$lot) {
        return dal_error('Lot introuvable.');
    }

    $doc_stmt = $pdo->prepare(
        "SELECT d.id, d.titre, d.type_document, d.status, d.source_item_id,
                d.contenu_brut, d.contenu_revise, d.hash_contenu, d.selected,
                d.theme_id, d.oeuvre_id, d.date_publication, d.citation_id,
                t.nom AS theme_nom, o.nom AS oeuvre_nom
         FROM documents d
         LEFT JOIN themes t ON d.theme_id = t.id
         LEFT JOIN oeuvres o ON d.oeuvre_id = o.id
         WHERE d.lot_id = :lot_id
         ORDER BY d.id"
    );
    $doc_stmt->execute(['lot_id' => $lot['lot_id']]);
    $docs = $doc_stmt->fetchAll();

    $docs = _dal_attach_lot_document_keywords($pdo, $docs);

    $lot['documents'] = $docs;
    return dal_ok($lot);
}

function dal_get_lot_journal(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'atelier.access');

    $stmt = $pdo->prepare(
        "SELECT l.lot_id FROM lots l WHERE l.id = :id"
    );
    $stmt->execute(['id' => $id]);
    $lot = $stmt->fetch();
    if (!$lot) {
        return dal_error('Lot introuvable.');
    }

    $journal_stmt = $pdo->prepare(
        "SELECT je.id, je.action, je.old_status, je.new_status, je.message,
                je.actor, je.actor_id, je.created_at,
                u.email AS actor_email
         FROM journal_events je
         LEFT JOIN users u ON je.actor_id = u.id
         WHERE je.lot_id = :lot_id
         ORDER BY je.created_at DESC"
    );
    $journal_stmt->execute(['lot_id' => $lot['lot_id']]);
    return dal_ok($journal_stmt->fetchAll());
}

function dal_get_lot_counts(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'atelier.access');
    $stmt = $pdo->query(
        "SELECT status, COUNT(*) AS cnt FROM lots GROUP BY status"
    );
    $counts = [];
    foreach ($stmt->fetchAll() as $row) {
        $counts[$row['status']] = (int) $row['cnt'];
    }
    return dal_ok($counts);
}

// ── Machine d'états ──────────────────────────────────────────────

function dal_update_lot_status(PDO $pdo, array $ctx, int $id, string $new_status, ?string $message = null): array
{
    dal_require_permission($ctx, 'atelier.lots');

    if ($new_status === 'integre') {
        dal_require_permission($ctx, 'atelier.validate');
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT id, lot_id, status, assigned_to FROM lots WHERE id = :id FOR UPDATE');
        $stmt->execute(['id' => $id]);
        $lot = $stmt->fetch();
        if (!$lot) {
            $pdo->rollBack();
            return dal_error('Lot introuvable.');
        }

        $old_status = $lot['status'];
        if (!dal_is_valid_lot_transition($old_status, $new_status)) {
            $pdo->rollBack();
            return dal_error("Transition impossible : {$old_status} → {$new_status}.");
        }

        $update_parts = ['status = :new_status'];
        $update_params = ['new_status' => $new_status, 'id' => $id];

        if ($new_status === 'integre') {
            $update_parts[] = 'integrated_at = NOW()';
        }

        $sql = 'UPDATE lots SET ' . implode(', ', $update_parts) . ' WHERE id = :id';
        $pdo->prepare($sql)->execute($update_params);

        _dal_log_journal($pdo, $lot['lot_id'], 'status_change', $old_status, $new_status, $ctx['user_id'] ?? null, $message);

        $pdo->commit();
        return dal_ok(['id' => $id, 'status' => $new_status]);
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function dal_assign_lot(PDO $pdo, array $ctx, int $id, ?int $user_id = null): array
{
    dal_require_permission($ctx, 'atelier.lots');

    $assign_to = $user_id ?? ($ctx['user_id'] ?? null);
    if ($assign_to === null) {
        return dal_error('Utilisateur non identifié.');
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT id, lot_id, status, assigned_to FROM lots WHERE id = :id FOR UPDATE');
        $stmt->execute(['id' => $id]);
        $lot = $stmt->fetch();
        if (!$lot) {
            $pdo->rollBack();
            return dal_error('Lot introuvable.');
        }

        if ($lot['status'] !== 'en_attente' && $user_id !== null && $ctx['role_id'] !== ROLE_ADMIN) {
            $pdo->rollBack();
            return dal_error('Seul un administrateur peut réassigner un lot en cours.');
        }

        $old_status = $lot['status'];
        $new_status = $old_status === 'en_attente' ? 'en_cours' : $old_status;

        $pdo->prepare('UPDATE lots SET assigned_to = :uid, status = :st WHERE id = :id')
            ->execute(['uid' => $assign_to, 'st' => $new_status, 'id' => $id]);

        if ($old_status !== $new_status) {
            _dal_log_journal($pdo, $lot['lot_id'], 'taken', $old_status, $new_status, $ctx['user_id'] ?? null);
        } else {
            _dal_log_journal($pdo, $lot['lot_id'], 'reassigned', null, null, $ctx['user_id'] ?? null);
        }

        $pdo->commit();
        return dal_ok(['id' => $id, 'status' => $new_status, 'assigned_to' => $assign_to]);
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// ── Documents du lot ─────────────────────────────────────────────

function dal_update_lot_document(PDO $pdo, array $ctx, int $doc_id, array $data): array
{
    dal_require_permission($ctx, 'atelier.lots');

    $params = ['id' => $doc_id];
    $fields = _dal_build_update_fields(
        $data,
        ['contenu_revise', 'selected', 'theme_id', 'oeuvre_id', 'date_publication'],
        $params
    );
    if (empty($fields)) {
        return dal_ok(['id' => $doc_id]);
    }

    if (array_key_exists('contenu_revise', $data) && $data['contenu_revise'] !== null) {
        $fields[] = 'hash_contenu = :hash_contenu';
        $params['hash_contenu'] = hash('sha256', $data['contenu_revise']);
    }

    $sql = 'UPDATE documents SET ' . implode(', ', $fields) . ' WHERE id = :id';
    $pdo->prepare($sql)->execute($params);
    return dal_ok(['id' => $doc_id]);
}

function dal_set_lot_document_keywords(PDO $pdo, array $ctx, int $doc_id, array $keyword_ids, string $source = 'manual'): array
{
    dal_require_permission($ctx, 'atelier.lots');

    $pdo->prepare('DELETE FROM lot_document_keywords WHERE document_id = :did AND source = :src')
        ->execute(['did' => $doc_id, 'src' => $source]);

    if (empty($keyword_ids)) {
        return dal_ok();
    }

    $placeholders = [];
    $params = [];
    foreach (array_values($keyword_ids) as $i => $kid) {
        $placeholders[] = "(:did_{$i}, :kid_{$i}, :src_{$i})";
        $params["did_{$i}"] = $doc_id;
        $params["kid_{$i}"] = (int) $kid;
        $params["src_{$i}"] = $source;
    }
    $sql = 'INSERT INTO lot_document_keywords (document_id, keyword_id, source) VALUES ' . implode(', ', $placeholders);
    $pdo->prepare($sql)->execute($params);
    return dal_ok();
}

function dal_delete_lot_document(PDO $pdo, array $ctx, int $lot_id, int $doc_id): array
{
    dal_require_permission($ctx, 'atelier.lots');

    $stmt = $pdo->prepare(
        'SELECT d.id FROM documents d JOIN lots l ON d.lot_id = l.lot_id WHERE d.id = :id AND l.id = :lot_id'
    );
    $stmt->execute(['id' => $doc_id, 'lot_id' => $lot_id]);
    $doc = $stmt->fetch();
    if (!$doc) {
        return dal_error('Document introuvable ou n\'appartient pas à ce lot.');
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM lot_document_keywords WHERE document_id = :did')
            ->execute(['did' => $doc_id]);
        $pdo->prepare('DELETE FROM documents WHERE id = :id')
            ->execute(['id' => $doc_id]);
        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    return dal_ok(['id' => $doc_id]);
}

// ── Conformité ───────────────────────────────────────────────────

function dal_check_lot_conformity(PDO $pdo, array $ctx, int $lot_id): array
{
    dal_require_permission($ctx, 'atelier.lots');
    $stmt = $pdo->prepare(
        "SELECT l.lot_id FROM lots l WHERE l.id = :id"
    );
    $stmt->execute(['id' => $lot_id]);
    $lot = $stmt->fetch();
    if (!$lot) {
        return dal_error('Lot introuvable.');
    }

    $docs_stmt = $pdo->prepare(
        "SELECT d.id, d.titre, d.oeuvre_id, d.theme_id, d.date_publication, d.source_item_id
         FROM documents d
         WHERE d.lot_id = :lot_id AND d.selected = 1"
    );
    $docs_stmt->execute(['lot_id' => $lot['lot_id']]);
    $docs = $docs_stmt->fetchAll();

    if (empty($docs)) {
        return dal_error('Aucun document sélectionné dans ce lot.');
    }

    $errors = [];
    $doc_ids = array_map(fn($d) => (int) $d['id'], $docs);
    $kw_counts = _dal_count_keywords_per_document($pdo, $doc_ids);

    foreach ($docs as $doc) {
        $doc_id = (int) $doc['id'];
        $doc_errors = [];
        if (empty($doc['oeuvre_id'])) {
            $doc_errors[] = 'Œuvre manquante';
        }
        if (empty($doc['theme_id'])) {
            $doc_errors[] = 'Thème manquant';
        }
        if (empty($doc['date_publication'])) {
            $doc_errors[] = 'Date manquante';
        }
        if (($kw_counts[$doc_id] ?? 0) === 0) {
            $doc_errors[] = 'Aucun mot-clé';
        }
        if (!empty($doc_errors)) {
            $errors[] = [
                'document_id' => $doc_id,
                'titre' => $doc['titre'] ?: "Document #{$doc_id}",
                'errors' => $doc_errors,
            ];
        }
    }

    if (!empty($errors)) {
        $missing = [];
        foreach ($errors as $e) {
            $missing[] = $e['titre'] . ' : ' . implode(', ', $e['errors']);
        }
        return dal_ok([
            'conforme' => false,
            'missing' => $missing,
            'documents_ok' => count($docs) - count($errors),
            'documents_total' => count($docs),
        ]);
    }
    return dal_ok([
        'conforme' => true,
        'missing' => [],
        'documents_ok' => count($docs),
        'documents_total' => count($docs),
    ]);
}

// ── Intégration corpus ───────────────────────────────────────────

function dal_integrate_lot(PDO $pdo, array $ctx, int $lot_id): array
{
    dal_require_permission($ctx, 'atelier.validate');

    $conformity = dal_check_lot_conformity($pdo, $ctx, $lot_id);
    if ($conformity['status'] !== 'ok') {
        return $conformity;
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT id, lot_id, status FROM lots WHERE id = :id FOR UPDATE');
        $stmt->execute(['id' => $lot_id]);
        $lot = $stmt->fetch();
        if (!$lot) {
            $pdo->rollBack();
            return dal_error('Lot introuvable.');
        }
        if ($lot['status'] !== 'pret') {
            $pdo->rollBack();
            return dal_error('Le lot doit être en statut « prêt » pour être intégré.');
        }

        $docs_stmt = $pdo->prepare(
            "SELECT d.id, d.contenu_brut, d.contenu_revise, d.oeuvre_id, d.theme_id,
                    d.date_publication, d.source_item_id
             FROM documents d
             WHERE d.lot_id = :lot_id AND d.selected = 1"
        );
        $docs_stmt->execute(['lot_id' => $lot['lot_id']]);
        $docs = $docs_stmt->fetchAll();

        $created = 0;
        $skipped_dupes = 0;

        foreach ($docs as $doc) {
            $contenu = $doc['contenu_revise'] ?: $doc['contenu_brut'];
            if (empty($contenu)) {
                continue;
            }

            // Dédup
            if (_dal_is_duplicate($pdo, $doc['source_item_id'], $contenu)) {
                $skipped_dupes++;
                continue;
            }

            $auteur_nom = _dal_resolve_auteur_nom_lots($pdo, (int) $doc['oeuvre_id']);

            $ins = $pdo->prepare(
                "INSERT INTO citations (contenu, oeuvre_id, theme_id, etat_id, auteur_nom,
                                        telegram_message_id, date_entree, lot_origin_id)
                 VALUES (:contenu, :oeuvre_id, :theme_id, :etat_id, :auteur_nom,
                         :tg_msg_id, :date_entree, :lot_origin_id)"
            );
            $ins->execute([
                'contenu'       => $contenu,
                'oeuvre_id'     => (int) $doc['oeuvre_id'],
                'theme_id'      => (int) $doc['theme_id'],
                'etat_id'       => ETAT_A_CORRIGER,
                'auteur_nom'    => $auteur_nom,
                'tg_msg_id'     => $doc['source_item_id'] ?: null,
                'date_entree'   => $doc['date_publication'],
                'lot_origin_id' => $lot_id,
            ]);
            $citation_id = (int) $pdo->lastInsertId();

            // Copier les mots-clés acceptés vers citation_keywords
            $kw_stmt = $pdo->prepare(
                "SELECT keyword_id FROM lot_document_keywords
                 WHERE document_id = :did AND source IN ('manual', 'ai_accepted')"
            );
            $kw_stmt->execute(['did' => (int) $doc['id']]);
            $kw_ids = array_column($kw_stmt->fetchAll(), 'keyword_id');
            if (!empty($kw_ids)) {
                _dal_replace_associations($pdo, 'citation_keywords', 'citation_id', $citation_id, 'keyword_id', array_map('intval', $kw_ids));
            }

            // Lien retour document → citation
            $pdo->prepare('UPDATE documents SET citation_id = :cid WHERE id = :did')
                ->execute(['cid' => $citation_id, 'did' => (int) $doc['id']]);

            $created++;
        }

        // Marquer lot intégré
        $pdo->prepare('UPDATE lots SET status = :st, integrated_at = NOW() WHERE id = :id')
            ->execute(['st' => 'integre', 'id' => $lot_id]);

        _dal_log_journal($pdo, $lot['lot_id'], 'integrated', 'pret', 'integre', $ctx['user_id'] ?? null,
            "Intégré : {$created} citations créées, {$skipped_dupes} doublons ignorés.");

        $pdo->commit();

        // Suppression du dossier lot (si mode_debug_global = OFF)
        _dal_maybe_delete_lot_folder($pdo, $lot);

        return dal_ok([
            'integrated' => $created,
            'duplicates' => $skipped_dupes,
            'lot_status' => 'integre',
        ]);
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// ── Helpers privés ───────────────────────────────────────────────

function _dal_log_journal(PDO $pdo, string $lot_id, string $action, ?string $old_status, ?string $new_status, ?int $actor_id, ?string $message = null): void
{
    $pdo->prepare(
        "INSERT INTO journal_events (lot_id, action, old_status, new_status, actor, actor_id, message)
         VALUES (:lot_id, :action, :old_status, :new_status, :actor, :actor_id, :message)"
    )->execute([
        'lot_id'     => $lot_id,
        'action'     => $action,
        'old_status' => $old_status,
        'new_status' => $new_status,
        'actor'      => $actor_id !== null ? 'user' : 'system',
        'actor_id'   => $actor_id,
        'message'    => $message,
    ]);
}

function _dal_is_duplicate(PDO $pdo, ?string $source_item_id, string $contenu): bool
{
    if ($source_item_id !== null && $source_item_id !== '') {
        $stmt = $pdo->prepare('SELECT id FROM citations WHERE telegram_message_id = :tg AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['tg' => $source_item_id]);
        if ($stmt->fetch()) {
            return true;
        }
    }

    $hash = hash('sha256', $contenu);
    $stmt = $pdo->prepare(
        "SELECT id FROM citations WHERE SHA2(contenu, 256) = :h AND deleted_at IS NULL LIMIT 1"
    );
    $stmt->execute(['h' => $hash]);
    return (bool) $stmt->fetch();
}

function _dal_resolve_auteur_nom_lots(PDO $pdo, int $oeuvre_id): ?string
{
    $stmt = $pdo->prepare('SELECT a.nom FROM auteurs a JOIN oeuvres o ON o.auteur_id = a.id WHERE o.id = :oid');
    $stmt->execute(['oid' => $oeuvre_id]);
    $row = $stmt->fetch();
    return $row ? $row['nom'] : null;
}

function _dal_count_keywords_per_document(PDO $pdo, array $doc_ids): array
{
    if (empty($doc_ids)) {
        return [];
    }
    $placeholders = implode(',', array_fill(0, count($doc_ids), '?'));
    $stmt = $pdo->prepare(
        "SELECT document_id, COUNT(*) AS cnt FROM lot_document_keywords
         WHERE document_id IN ({$placeholders}) AND source IN ('manual', 'ai_accepted')
         GROUP BY document_id"
    );
    $stmt->execute(array_values($doc_ids));
    $counts = [];
    foreach ($stmt->fetchAll() as $row) {
        $counts[(int) $row['document_id']] = (int) $row['cnt'];
    }
    return $counts;
}

function _dal_attach_lot_document_keywords(PDO $pdo, array $docs): array
{
    if (empty($docs)) {
        return $docs;
    }
    $ids = array_map(fn($d) => (int) $d['id'], $docs);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare(
        "SELECT ldk.document_id, k.id, k.mot, ldk.source
         FROM lot_document_keywords ldk
         JOIN keywords k ON ldk.keyword_id = k.id
         WHERE ldk.document_id IN ({$placeholders})
         ORDER BY k.mot"
    );
    $stmt->execute($ids);
    $by_doc = [];
    foreach ($stmt->fetchAll() as $kw) {
        $by_doc[(int) $kw['document_id']][] = [
            'keyword_id' => (int) $kw['id'],
            'mot' => $kw['mot'],
            'source' => $kw['source'],
        ];
    }
    foreach ($docs as &$doc) {
        $doc['keywords'] = $by_doc[(int) $doc['id']] ?? [];
    }
    unset($doc);
    return $docs;
}

function _dal_maybe_delete_lot_folder(PDO $pdo, array $lot): void
{
    $stmt = $pdo->prepare("SELECT valeur FROM config WHERE cle = 'mode_debug_global'");
    $stmt->execute();
    $debug = $stmt->fetch();
    if ($debug && $debug['valeur'] === '1') {
        return;
    }

    $path = $lot['server_lot_path'] ?? '';
    if ($path === '' || !is_dir($path)) {
        return;
    }

    $it = new RecursiveDirectoryIterator($path, RecursiveDirectoryIterator::SKIP_DOTS);
    $files = new RecursiveIteratorIterator($it, RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($files as $file) {
        if ($file->isDir()) {
            rmdir($file->getRealPath());
        } else {
            unlink($file->getRealPath());
        }
    }
    rmdir($path);
}
