<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

/**
 * R6 (révisé) — Normalisation d'un mot-clé. Règle unique partagée par la
 * recherche, la création et l'upsert.
 *
 * - trim
 * - la casse est PRÉSERVÉE (« Nécessité » reste « Nécessité ») ;
 * - en français les MAJUSCULES ne portent pas d'accent : on retire l'accent
 *   des seules lettres majuscules (« Évolution » → « Evolution »), les
 *   minuscules accentuées sont conservées.
 *
 * L'unicité insensible casse/accents est garantie par la collation
 * utf8mb4_unicode_520_ci de la colonne keywords.mot.
 */
function _dal_normalize_keyword(string $mot): string
{
    $upper_accents = [
        'À' => 'A', 'Á' => 'A', 'Â' => 'A', 'Ã' => 'A', 'Ä' => 'A', 'Å' => 'A',
        'È' => 'E', 'É' => 'E', 'Ê' => 'E', 'Ë' => 'E',
        'Ì' => 'I', 'Í' => 'I', 'Î' => 'I', 'Ï' => 'I',
        'Ò' => 'O', 'Ó' => 'O', 'Ô' => 'O', 'Õ' => 'O', 'Ö' => 'O',
        'Ù' => 'U', 'Ú' => 'U', 'Û' => 'U', 'Ü' => 'U',
        'Ç' => 'C', 'Ñ' => 'N', 'Ý' => 'Y', 'Ÿ' => 'Y',
    ];
    return strtr(trim($mot), $upper_accents);
}

function dal_find_keywords(PDO $pdo, array $ctx, ?string $search = null): array
{
    dal_require_permission($ctx, 'corpus.read');
    if ($search !== null && $search !== '') {
        $stmt = $pdo->prepare(
            'SELECT k.id, k.mot, COUNT(ck.citation_id) AS citation_count
             FROM keywords k
             LEFT JOIN citation_keywords ck ON ck.keyword_id = k.id
             WHERE k.mot LIKE :search
             GROUP BY k.id, k.mot
             ORDER BY k.mot
             LIMIT 100'
        );
        $stmt->execute(['search' => _dal_normalize_keyword($search) . '%']);
    } else {
        $stmt = $pdo->prepare(
            'SELECT k.id, k.mot, COUNT(ck.citation_id) AS citation_count
             FROM keywords k
             LEFT JOIN citation_keywords ck ON ck.keyword_id = k.id
             GROUP BY k.id, k.mot
             ORDER BY k.mot'
        );
        $stmt->execute();
    }
    return dal_ok($stmt->fetchAll());
}

function dal_create_keyword(PDO $pdo, array $ctx, string $mot): array
{
    dal_require_permission($ctx, 'keywords.manage');
    $normalized = _dal_normalize_keyword($mot);
    if ($normalized === '') {
        return dal_error('Le mot-clé ne peut pas être vide.');
    }
    try {
        $stmt = $pdo->prepare('INSERT INTO keywords (mot) VALUES (:mot)');
        $stmt->execute(['mot' => $normalized]);
        return dal_ok(['id' => (int) $pdo->lastInsertId()]);
    } catch (\PDOException $e) {
        if ($e->getCode() === '23000') {
            $stmt = $pdo->prepare('SELECT id FROM keywords WHERE mot = :mot');
            $stmt->execute(['mot' => $normalized]);
            $existing = $stmt->fetch();
            return dal_error('Ce mot-clé existe déjà (id=' . ($existing['id'] ?? '?') . ').');
        }
        throw $e;
    }
}

/**
 * R6 — Find or create: upsert pattern.
 */
function dal_find_or_create_keyword(PDO $pdo, array $ctx, string $mot): array
{
    dal_require_permission($ctx, 'keywords.manage');
    $normalized = _dal_normalize_keyword($mot);
    if ($normalized === '') {
        return dal_error('Le mot-clé ne peut pas être vide.');
    }
    $stmt = $pdo->prepare('SELECT id, mot FROM keywords WHERE mot = :mot');
    $stmt->execute(['mot' => $normalized]);
    $existing = $stmt->fetch();
    if ($existing) {
        // Mise à jour de la casse si l'entrée existante diffère (ancienne norm. lowercase).
        if ($existing['mot'] !== $normalized) {
            $pdo->prepare('UPDATE keywords SET mot = :mot WHERE id = :id')
                ->execute(['mot' => $normalized, 'id' => $existing['id']]);
            $existing['mot'] = $normalized;
        }
        return dal_ok($existing);
    }
    $stmt = $pdo->prepare('INSERT INTO keywords (mot) VALUES (:mot)');
    $stmt->execute(['mot' => $normalized]);
    return dal_ok(['id' => (int) $pdo->lastInsertId(), 'mot' => $normalized]);
}

function dal_update_keyword(PDO $pdo, array $ctx, int $id, string $mot): array
{
    dal_require_permission($ctx, 'keywords.manage');
    $normalized = _dal_normalize_keyword($mot);
    if ($normalized === '') {
        return dal_error('Le mot-clé ne peut pas être vide.');
    }
    $stmt = $pdo->prepare('SELECT id FROM keywords WHERE id = :id');
    $stmt->execute(['id' => $id]);
    if (!$stmt->fetch()) {
        return dal_error('Mot-clé introuvable.');
    }
    try {
        $pdo->prepare('UPDATE keywords SET mot = :mot WHERE id = :id')
            ->execute(['mot' => $normalized, 'id' => $id]);
        return dal_ok(['id' => $id]);
    } catch (\PDOException $e) {
        if ($e->getCode() === '23000') {
            return dal_error('Ce mot-clé existe déjà.');
        }
        throw $e;
    }
}

function dal_get_keyword_usages(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'keywords.manage');
    $stmt = $pdo->prepare(
        "SELECT c.id AS citation_id, LEFT(c.contenu, 80) AS titre
         FROM citations c
         JOIN citation_keywords ck ON ck.citation_id = c.id
         WHERE ck.keyword_id = :id AND c.deleted_at IS NULL
         ORDER BY c.id
         LIMIT 50"
    );
    $stmt->execute(['id' => $id]);
    return dal_ok($stmt->fetchAll());
}

function dal_delete_keyword(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'keywords.manage');
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM citation_keywords WHERE keyword_id = :id');
    $stmt->execute(['id' => $id]);
    if ((int) $stmt->fetchColumn() > 0) {
        return dal_error('Ce mot-clé est utilisé dans des entrées. Retirez-le d\'abord.');
    }
    $stmt = $pdo->prepare('DELETE FROM keywords WHERE id = :id');
    $stmt->execute(['id' => $id]);
    return $stmt->rowCount() > 0 ? dal_ok() : dal_error('Mot-clé introuvable.');
}
