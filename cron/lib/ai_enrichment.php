<?php

declare(strict_types=1);

/**
 * Enrichissement IA d'un lot à l'import (suggestions à valider en révision).
 *
 * Modèle à 2 états : l'IA ne fait que *proposer*.
 *   • Thème    → documents.theme_suggested_id (jamais documents.theme_id).
 *   • Mots-clés → lot_document_keywords.source = 'ai_suggested'.
 * La validation humaine (révision) bascule ces suggestions en « manuel ».
 * La conformité ne compte que le validé/humain : une suggestion seule ne rend
 * jamais un lot conforme.
 */

require_once dirname(__DIR__, 2) . '/api/dal/ai.php';
require_once dirname(__DIR__, 2) . '/api/dal/keywords.php';
require_once dirname(__DIR__, 2) . '/api/dal/themes.php';

/**
 * Contexte « système » pour les appels IA hors session HTTP (cron).
 * Porte les permissions de lecture/écriture nécessaires, sans utilisateur.
 *
 * @return array<string, mixed>
 */
function epuriel_system_ctx(): array
{
    return [
        'user_id'         => null,
        'role_id'         => ROLE_ADMIN,
        'role_nom'        => 'system',
        'permissions'     => ['corpus.read', 'corpus.read_all', 'corpus.write',
                              'keywords.manage', 'themes.manage', 'atelier.lots'],
        'include_deleted' => false,
    ];
}

/**
 * Charge les thèmes avec leur libellé parent (format attendu par dal_ai_suggest_theme).
 *
 * @return list<array<string, mixed>>
 */
function epuriel_themes_with_parents(PDO $pdo, array $ctx): array
{
    $res = dal_find_themes($pdo, $ctx);
    if ($res['status'] !== 'ok' || !is_array($res['data'])) {
        return [];
    }
    $raw = $res['data'];
    $parents = [];
    foreach ($raw as $t) {
        if ($t['parent_id'] === null) {
            $parents[(int) $t['id']] = $t['nom'];
        }
    }
    return array_map(static function (array $t) use ($parents): array {
        $t['parent_nom'] = $t['parent_id'] !== null ? ($parents[(int) $t['parent_id']] ?? null) : null;
        return $t;
    }, $raw);
}

/**
 * Applique en base les suggestions IA d'un document.
 *   - theme_suggested_id : posé seulement si aucun thème validé (theme_id NULL).
 *   - mots-clés : insérés en 'ai_suggested', sans écraser un mot-clé déjà présent
 *     (un 'manual'/hashtag existant est préservé via ON DUPLICATE KEY no-op).
 *
 * @param list<string> $keywords
 */
function epuriel_store_ai_suggestions(PDO $pdo, int $docId, ?int $themeId, array $keywords): void
{
    if ($themeId !== null) {
        $pdo->prepare(
            "UPDATE documents SET theme_suggested_id = :tid
             WHERE id = :did AND theme_id IS NULL"
        )->execute(['tid' => $themeId, 'did' => $docId]);
    }

    // ON DUPLICATE KEY UPDATE : si le mot existe en minuscules (ancienne norm.),
    // on met à jour la casse plutôt que d'ignorer silencieusement.
    $kwCreate = $pdo->prepare("INSERT INTO keywords (mot) VALUES (?) ON DUPLICATE KEY UPDATE mot = VALUES(mot)");
    $kwLink = $pdo->prepare(
        "INSERT INTO lot_document_keywords (document_id, keyword_id, source)
         SELECT ?, k.id, 'ai_suggested'
         FROM keywords k WHERE LOWER(k.mot) = LOWER(?)
         ON DUPLICATE KEY UPDATE source = source"
    );
    foreach ($keywords as $kw) {
        // Même normalisation que la saisie/validation manuelle : casse préservée,
        // accents retirés des majuscules (cf. _dal_normalize_keyword).
        $kw = _dal_normalize_keyword($kw);
        if ($kw === '') {
            continue;
        }
        $kwCreate->execute([$kw]);
        $kwLink->execute([$docId, $kw]);
    }
}

/**
 * Enrichit tous les documents sélectionnés d'un lot via l'IA (best-effort).
 * Un échec IA sur un document est journalisé et n'interrompt pas le traitement :
 * les champs restent vides, l'éditeur complétera/relancera en révision.
 *
 * @return array{enriched:int, failed:int}
 */
function epuriel_enrich_lot_documents_ai(PDO $pdo, string $lotId): array
{
    $ctx = epuriel_system_ctx();

    $themes = epuriel_themes_with_parents($pdo, $ctx);
    $kwRes = dal_find_keywords($pdo, $ctx);
    $existingKw = ($kwRes['status'] === 'ok' && is_array($kwRes['data'])) ? $kwRes['data'] : [];

    $stmt = $pdo->prepare(
        "SELECT id, COALESCE(NULLIF(contenu_revise, ''), contenu_brut) AS contenu
         FROM documents WHERE lot_id = ? AND selected = 1"
    );
    $stmt->execute([$lotId]);
    $docs = $stmt->fetchAll();

    $enriched = 0;
    $failed = 0;
    foreach ($docs as $doc) {
        $contenu = trim((string) ($doc['contenu'] ?? ''));
        if ($contenu === '') {
            continue;
        }
        $docId = (int) $doc['id'];
        try {
            $themeId = null;
            if (!empty($themes)) {
                $tRes = dal_ai_suggest_theme($pdo, $ctx, $contenu, $themes);
                if ($tRes['status'] === 'ok' && isset($tRes['data']['theme_id'])) {
                    $themeId = (int) $tRes['data']['theme_id'];
                }
            }

            $keywords = [];
            $kRes = dal_ai_suggest_keywords($pdo, $ctx, $contenu, $existingKw);
            if ($kRes['status'] === 'ok' && isset($kRes['data']['keywords'])) {
                $keywords = $kRes['data']['keywords'];
            }

            epuriel_store_ai_suggestions($pdo, $docId, $themeId, $keywords);
            $enriched++;
        } catch (\Throwable $e) {
            $failed++;
            // Journalisation best-effort ; on n'interrompt pas le lot.
            try {
                $pdo->prepare(
                    "INSERT INTO journal_events (lot_id, action, old_status, new_status, actor, message)
                     VALUES (?, 'enrichissement_ia_echec', NULL, NULL, 'system', ?)"
                )->execute([$lotId, "Document #$docId : " . $e->getMessage()]);
            } catch (\Throwable) {
                // ignore
            }
        }
    }

    return ['enriched' => $enriched, 'failed' => $failed];
}
