<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';

function dal_find_emojis(PDO $pdo, array $ctx, ?string $search = null): array
{
    dal_require_permission($ctx, 'corpus.read');
    if ($search !== null && $search !== '') {
        $stmt = $pdo->prepare('SELECT id, code FROM emojis WHERE code LIKE :search ORDER BY code');
        $stmt->execute(['search' => '%' . $search . '%']);
    } else {
        $stmt = $pdo->prepare('SELECT id, code FROM emojis ORDER BY code');
        $stmt->execute();
    }
    return dal_ok($stmt->fetchAll());
}

function dal_create_emoji(PDO $pdo, array $ctx, array $data): array
{
    dal_require_permission($ctx, 'admin.settings');
    $code = trim($data['code'] ?? '');
    if ($code === '') {
        return dal_error('Le code emoji est requis.');
    }
    try {
        $stmt = $pdo->prepare('INSERT INTO emojis (code) VALUES (:code)');
        $stmt->execute(['code' => $code]);
        return dal_ok(['id' => (int) $pdo->lastInsertId()]);
    } catch (\PDOException $e) {
        if ($e->getCode() === '23000') {
            return dal_error('Ce code emoji existe déjà.');
        }
        throw $e;
    }
}

function dal_delete_emoji(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'admin.settings');
    $stmt = $pdo->prepare('DELETE FROM emojis WHERE id = :id');
    $stmt->execute(['id' => $id]);
    return $stmt->rowCount() > 0 ? dal_ok() : dal_error('Emoji introuvable.');
}
