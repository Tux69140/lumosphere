<?php

/**
 * Agrégateur Telegram Lumosphère.
 * À chaque exécution, draine tout le tampon « live » bufferisé de chaque source
 * en un lot (1 document par message, contenu_brut en base).
 * La fréquence de génération est pilotée par le cron, pas par le script :
 * autant d'exécutions = autant d'occasions de générer un lot depuis le buffer.
 */

declare(strict_types=1);

require_once __DIR__ . '/bootstrap_cron.php';
require_once __DIR__ . '/lib/telegram_pipeline.php';

['pdo' => $pdo] = cron_bootstrap();

try {
    $created = generate_telegram_lots_from_buffer($pdo);

    if (count($created) === 0) {
        echo "Aucun message bufferise : aucun lot genere.\n";
    } else {
        echo 'Lots Telegram generes : ' . implode(', ', $created) . "\n";
    }
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Erreur agregateur Telegram: ' . $e->getMessage() . "\n");
    exit(1);
}

/**
 * Pour chaque source telegram active, agrège tout le tampon live bufferisé
 * (sans filtre de date) en un lot. Verrou par source pour éviter toute
 * collision avec une collecte ou une agrégation manuelle concurrente.
 *
 * @return list<string>
 */
function generate_telegram_lots_from_buffer(PDO $pdo): array
{
    $sources = $pdo->query(
        "SELECT * FROM collect_sources
         WHERE source_type IN ('telegram','Telegram') AND enabled = 1 ORDER BY id ASC"
    )->fetchAll();
    $created = [];
    foreach ($sources as $source) {
        $lotId = tg_with_source_lock($pdo, (int) $source['id'], static function () use ($pdo, $source) {
            $res = tg_aggregate_source($pdo, $source, 'live', null, null);
            return $res['lot_id'];
        });
        if ($lotId !== null) {
            $created[] = $lotId;
        }
    }
    return $created;
}
