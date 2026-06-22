<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

function dal_find_keywords(PDO $pdo, array $ctx, ?string $search = null): array
{
    dal_require_permission($ctx, 'corpus.read');
    if ($search !== null && $search !== '') {
        $stmt = $pdo->prepare('SELECT id, mot FROM keywords WHERE mot LIKE :search ORDER BY mot LIMIT 100');
        $stmt->execute(['search' => mb_strtolower(trim($search), 'UTF-8') . '%']);
    } else {
        $stmt = $pdo->prepare('SELECT id, mot FROM keywords ORDER BY mot');
        $stmt->execute();
    }
    return dal_ok($stmt->fetchAll());
}

/**
 * R6 — Keywords normalized: mb_strtolower + trim on write.
 * Collation utf8mb4_unicode_520_ci handles case-insensitive uniqueness.
 */
function dal_create_keyword(PDO $pdo, array $ctx, string $mot): array
{
    dal_require_permission($ctx, 'keywords.manage');
    $normalized = mb_strtolower(trim($mot), 'UTF-8');
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
    $normalized = mb_strtolower(trim($mot), 'UTF-8');
    if ($normalized === '') {
        return dal_error('Le mot-clé ne peut pas être vide.');
    }
    $stmt = $pdo->prepare('SELECT id, mot FROM keywords WHERE mot = :mot');
    $stmt->execute(['mot' => $normalized]);
    $existing = $stmt->fetch();
    if ($existing) {
        return dal_ok($existing);
    }
    $stmt = $pdo->prepare('INSERT INTO keywords (mot) VALUES (:mot)');
    $stmt->execute(['mot' => $normalized]);
    return dal_ok(['id' => (int) $pdo->lastInsertId(), 'mot' => $normalized]);
}

function dal_delete_keyword(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'keywords.manage');
    $stmt = $pdo->prepare('DELETE FROM keywords WHERE id = :id');
    $stmt->execute(['id' => $id]);
    return $stmt->rowCount() > 0 ? dal_ok() : dal_error('Mot-clé introuvable.');
}
