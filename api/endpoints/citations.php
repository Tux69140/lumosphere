<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/citations.php';

/**
 * Lit un paramètre liste CSV ("1,2,3") en tableau, ou null.
 * Tolère un envoi tableau (?ids[]=1) sans déclencher de TypeError sur explode().
 */
function _citations_csv_param(string $key): ?array
{
    return isset($_GET[$key]) && is_string($_GET[$key]) ? explode(',', $_GET[$key]) : null;
}

/** Taille de page bornée pour préserver le serveur (keyset, page_size = 50 par défaut). */
function _citations_page_size(): int
{
    $size = (int) ($_GET['page_size'] ?? PAGE_SIZE_DEFAULT);
    return max(1, min(MAX_PAGE_SIZE, $size));
}

/** Construit le jeu de filtres commun (search / find / count) à partir de $_GET. */
function _citations_filters(): array
{
    return array_filter([
        'oeuvre_id'    => $_GET['oeuvre_id'] ?? null,
        'theme_id'     => $_GET['theme_id'] ?? null,
        'oeuvre_ids'   => _citations_csv_param('oeuvre_ids'),
        'theme_ids'    => _citations_csv_param('theme_ids'),
        'etat_id'      => $_GET['etat_id'] ?? null,
        'auteur_id'    => $_GET['auteur_id'] ?? null,
        'keyword_ids'  => _citations_csv_param('keyword_ids'),
        'keyword_mode' => $_GET['keyword_mode'] ?? null,
        'date_from'    => $_GET['date_from'] ?? null,
        'date_to'      => $_GET['date_to'] ?? null,
        'sort'           => $_GET['sort'] ?? null,
        'favorites_only' => $_GET['favorites_only'] ?? null,
    ]);
}

function endpoint_citations(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $id === null && isset($_GET['q']) && is_string($_GET['q']) => dal_search_citations(
            $pdo, $ctx, $_GET['q'], _citations_filters(), $_GET['cursor'] ?? null, _citations_page_size()
        ),
        $method === 'GET' && $id === null && $action === 'count' => dal_count_citations(
            $pdo, $ctx, _citations_filters()
        ),
        $method === 'GET' && $id === null => dal_find_citations(
            $pdo, $ctx, _citations_filters(), $_GET['cursor'] ?? null, _citations_page_size()
        ),
        $method === 'GET' && $id !== null => dal_get_citation($pdo, $ctx, $id),
        $method === 'POST' && $id === null => dal_create_citation($pdo, $ctx, $body ?? []),
        $method === 'PUT' && $id === null && $action === 'bulk' => dal_bulk_update_citations(
            $pdo, $ctx, $body['ids'] ?? [], $body['fields'] ?? []
        ),
        $method === 'PUT' && $id !== null && $action === 'keywords' => dal_set_citation_keywords(
            $pdo, $ctx, $id, $body['keyword_ids'] ?? []
        ),
        $method === 'PUT' && $id !== null && $action === 'restore' => dal_restore_citation($pdo, $ctx, $id),
        $method === 'PUT' && $id !== null => dal_update_citation($pdo, $ctx, $id, $body ?? []),
        $method === 'DELETE' && $id === null && $action === 'bulk' => dal_bulk_delete_citations(
            $pdo, $ctx, $body['ids'] ?? []
        ),
        $method === 'DELETE' && $id !== null => dal_soft_delete_citation($pdo, $ctx, $id),
        default => dal_error('Méthode non supportée.'),
    };
}
