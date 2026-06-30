<?php

declare(strict_types=1);

require_once __DIR__ . '/core.php';
require_once dirname(__DIR__, 2) . '/cron/lib/telegram_pipeline.php';

/**
 * Picto live : collecte → agrégation de tout l'en-attente → réveil worker.
 *
 * @return array{status: string, data: array{lots: list<string>}, errors: list<string>}
 */
function dal_collecte_run(PDO $pdo, array $ctx, array $config): array
{
    dal_require_permission($ctx, 'atelier.lots');

    $sources = $pdo->query(
        "SELECT * FROM collect_sources
         WHERE source_type IN ('telegram', 'Telegram')
           AND enabled = 1
         ORDER BY id ASC"
    )->fetchAll();

    $lots = [];
    foreach ($sources as $source) {
        $lot_id = tg_with_source_lock($pdo, (int) $source['id'], function () use ($pdo, $config, $source) {
            tg_collect_into_buffer($pdo, $config, 'live');
            $fresh_stmt = $pdo->prepare('SELECT * FROM collect_sources WHERE id = :id');
            $fresh_stmt->execute(['id' => (int) $source['id']]);
            $fresh = $fresh_stmt->fetch();
            $res = tg_aggregate_source($pdo, $fresh, 'live', null, null);
            return $res['lot_id'] ?? null;
        });

        if ($lot_id !== null) {
            $lots[] = $lot_id;
        }
    }

    if (count($lots) > 0) {
        dal_collecte_wake_worker($config);
    }

    return dal_ok(['lots' => $lots]);
}

/**
 * Tapis roulant historique : réappro toutes sources history_import_enabled jusqu'au seuil 8 + bonus.
 *
 * @return array{status: string, data: array{created: int}, errors: list<string>}
 */
function dal_collecte_topup(PDO $pdo, array $ctx, int $bonus = 0): array
{
    dal_require_permission($ctx, 'atelier.lots');

    $target = 8 + max(0, $bonus);

    $sources = $pdo->query(
        "SELECT * FROM collect_sources
         WHERE source_type IN ('telegram', 'Telegram')
           AND history_import_enabled = 1
         ORDER BY id ASC"
    )->fetchAll();

    $created = 0;
    foreach ($sources as $source) {
        $res = tg_topup_historical($pdo, $source, $target);
        $created += (int) ($res['created'] ?? 0);
    }

    if ($created > 0) {
        /** @var array $config */
        $config = require dirname(__DIR__, 2) . '/config/config.php';
        dal_collecte_wake_worker($config);
    }

    return dal_ok(['created' => $created]);
}

/**
 * Réveille le runner de jobs en arrière-plan (ne bloque pas la requête HTTP).
 */
function dal_collecte_wake_worker(array $config): void
{
    $php    = $config['php_bin'] ?? 'php';
    $runner = dirname(__DIR__, 2) . '/cron/run_jobs.php';

    if (!is_file($runner)) {
        return;
    }

    $cmd = 'RUN_JOBS_MAX=20 nohup '
        . escapeshellarg($php) . ' '
        . escapeshellarg($runner)
        . ' > /dev/null 2>&1 &';

    exec($cmd);
}
