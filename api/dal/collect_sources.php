<?php

declare(strict_types=1);

function dal_find_collect_sources(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'oeuvres.manage');
    $stmt = $pdo->query(
        'SELECT id, label, source_type FROM collect_sources ORDER BY label'
    );
    return dal_ok($stmt->fetchAll());
}

function dal_link_oeuvre_source(PDO $pdo, array $ctx, int $oeuvre_id, ?int $source_id): array
{
    dal_require_permission($ctx, 'oeuvres.manage');

    $stmt = $pdo->prepare('SELECT id FROM oeuvres WHERE id = :id');
    $stmt->execute(['id' => $oeuvre_id]);
    if (!$stmt->fetch()) {
        return dal_error('Œuvre introuvable.');
    }

    if ($source_id !== null) {
        $stmt = $pdo->prepare('SELECT id FROM collect_sources WHERE id = :id');
        $stmt->execute(['id' => $source_id]);
        if (!$stmt->fetch()) {
            return dal_error('Source introuvable.');
        }
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE collect_sources SET oeuvre_id = NULL WHERE oeuvre_id = :oeuvre_id')
            ->execute(['oeuvre_id' => $oeuvre_id]);

        if ($source_id !== null) {
            $pdo->prepare('UPDATE collect_sources SET oeuvre_id = :oeuvre_id WHERE id = :id')
                ->execute(['oeuvre_id' => $oeuvre_id, 'id' => $source_id]);
        }

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    return dal_ok();
}
