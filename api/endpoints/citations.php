<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/citations.php';

function endpoint_citations(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    return match (true) {
        $method === 'GET' && $id === null && isset($_GET['q']) => dal_search_citations(
            $pdo, $ctx, $_GET['q'],
            array_filter([
                'oeuvre_id'    => $_GET['oeuvre_id'] ?? null,
                'theme_id'     => $_GET['theme_id'] ?? null,
                'etat_id'      => $_GET['etat_id'] ?? null,
                'auteur_id'    => $_GET['auteur_id'] ?? null,
                'keyword_ids'  => isset($_GET['keyword_ids']) ? explode(',', $_GET['keyword_ids']) : null,
                'keyword_mode' => $_GET['keyword_mode'] ?? null,
                'date_from'    => $_GET['date_from'] ?? null,
                'date_to'      => $_GET['date_to'] ?? null,
            ]),
            $_GET['cursor'] ?? null,
            (int) ($_GET['page_size'] ?? PAGE_SIZE_DEFAULT)
        ),
        $method === 'GET' && $id === null && $action === 'count' => dal_count_citations(
            $pdo, $ctx,
            array_filter([
                'oeuvre_id' => $_GET['oeuvre_id'] ?? null,
                'etat_id'   => $_GET['etat_id'] ?? null,
            ])
        ),
        $method === 'GET' && $id === null => dal_find_citations(
            $pdo, $ctx,
            array_filter([
                'oeuvre_id'    => $_GET['oeuvre_id'] ?? null,
                'theme_id'     => $_GET['theme_id'] ?? null,
                'etat_id'      => $_GET['etat_id'] ?? null,
                'auteur_id'    => $_GET['auteur_id'] ?? null,
                'keyword_ids'  => isset($_GET['keyword_ids']) ? explode(',', $_GET['keyword_ids']) : null,
                'keyword_mode' => $_GET['keyword_mode'] ?? null,
                'date_from'    => $_GET['date_from'] ?? null,
                'date_to'      => $_GET['date_to'] ?? null,
            ]),
            $_GET['cursor'] ?? null,
            (int) ($_GET['page_size'] ?? PAGE_SIZE_DEFAULT)
        ),
        $method === 'GET' && $id !== null => dal_get_citation($pdo, $ctx, $id),
        $method === 'POST' && $id === null => dal_create_citation($pdo, $ctx, $body ?? []),
        $method === 'PUT' && $id !== null && $action === 'keywords' => dal_set_citation_keywords(
            $pdo, $ctx, $id, $body['keyword_ids'] ?? []
        ),
        $method === 'PUT' && $id !== null && $action === 'restore' => dal_restore_citation($pdo, $ctx, $id),
        $method === 'PUT' && $id !== null => dal_update_citation($pdo, $ctx, $id, $body ?? []),
        $method === 'DELETE' && $id !== null => dal_soft_delete_citation($pdo, $ctx, $id),
        default => dal_error('Méthode non supportée.'),
    };
}
