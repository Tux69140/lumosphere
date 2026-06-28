<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/lots.php';

function _lots_page_size(): int
{
    $size = (int) ($_GET['page_size'] ?? PAGE_SIZE_DEFAULT);
    return max(1, min(MAX_PAGE_SIZE, $size));
}

function _lots_filters(): array
{
    return array_filter([
        'source_type' => $_GET['source_type'] ?? null,
        'status'      => $_GET['status'] ?? null,
        'assigned_to' => $_GET['assigned_to'] ?? null,
        'my_lots'     => $_GET['my_lots'] ?? null,
        'date_from'   => $_GET['date_from'] ?? null,
        'date_to'     => $_GET['date_to'] ?? null,
    ]);
}

function endpoint_lots(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        // GET /api/lots — liste filtrée
        $method === 'GET' && $id === null && $action === 'counts' =>
            dal_get_lot_counts($pdo, $ctx),

        $method === 'GET' && $id === null =>
            dal_find_lots($pdo, $ctx, _lots_filters(), $_GET['cursor'] ?? null, _lots_page_size()),

        // GET /api/lots/{id} — détail
        $method === 'GET' && $id !== null && $action === 'journal' =>
            dal_get_lot_journal($pdo, $ctx, $id),

        $method === 'GET' && $id !== null =>
            dal_get_lot($pdo, $ctx, $id),

        // PUT /api/lots/{id}/status — transition d'état
        $method === 'PUT' && $id !== null && $action === 'status' =>
            dal_update_lot_status($pdo, $ctx, $id, $body['status'] ?? '', $body['message'] ?? null),

        // PUT /api/lots/{id}/assign — assigner
        $method === 'PUT' && $id !== null && $action === 'assign' =>
            dal_assign_lot($pdo, $ctx, $id, isset($body['user_id']) ? (int) $body['user_id'] : null),

        // POST /api/lots/{id}/integrate — intégration corpus
        $method === 'POST' && $id !== null && $action === 'integrate' =>
            dal_integrate_lot($pdo, $ctx, $id),

        // POST /api/lots/{id}/conformity — vérification conformité
        $method === 'POST' && $id !== null && $action === 'conformity' =>
            dal_check_lot_conformity($pdo, $ctx, $id),

        // PUT /api/lots/documents/{id} — modifier un document du lot
        $method === 'PUT' && $id !== null && $action === 'document' =>
            dal_update_lot_document($pdo, $ctx, (int) ($body['document_id'] ?? 0), $body ?? []),

        // PUT /api/lots/documents/{id}/keywords — mots-clés d'un document
        $method === 'PUT' && $id !== null && $action === 'document-keywords' =>
            dal_set_lot_document_keywords(
                $pdo, $ctx, (int) ($body['document_id'] ?? 0), $body['keyword_ids'] ?? [], $body['source'] ?? 'manual'
            ),

        // DELETE /api/lots/{id}/document — supprimer un document du lot
        $method === 'DELETE' && $id !== null && $action === 'document' =>
            dal_delete_lot_document($pdo, $ctx, $id, (int) ($body['document_id'] ?? 0)),

        default => dal_error('Méthode non supportée.'),
    };
}
