<?php

declare(strict_types=1);

/**
 * Agrégateur Telegram hebdomadaire Lumosphère.
 * Crée un lot par source avec 1 document par message (contenu_brut en base).
 * Déclenche automatiquement le lundi ou sur demande via env FORCE_WEEKLY=1.
 */

require_once __DIR__ . '/bootstrap_cron.php';
require_once __DIR__ . '/lib/telegram_pipeline.php';

$forceWeekly = getenv('FORCE_WEEKLY') === '1';

try {
    if (!$forceWeekly && (new DateTimeImmutable())->format('N') !== '1') {
        echo "Pas lundi, generation hebdomadaire ignoree.\n";
        exit(0);
    }

    $dates = epuriel_previous_week_dates(new DateTimeImmutable());
    $created = generate_weekly_telegram_lots($pdo, $dates['date_debut'], $dates['date_fin']);

    if (count($created) === 0) {
        echo "Aucun lot Telegram genere pour la semaine.\n";
    } else {
        echo 'Lots Telegram generes : ' . implode(', ', $created) . "\n";
    }
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Erreur agregateur Telegram: ' . $e->getMessage() . "\n");
    exit(1);
}

/**
 * @return array{date_debut:string, date_fin:string}
 */
function epuriel_previous_week_dates(DateTimeInterface $now): array
{
    $mondayLastWeek = (new DateTimeImmutable($now->format('Y-m-d H:i:s')))
        ->modify('monday last week')
        ->setTime(0, 0, 0);
    $sundayLastWeek = $mondayLastWeek->modify('sunday this week')->setTime(23, 59, 59);

    return [
        'date_debut' => $mondayLastWeek->format('Y-m-d'),
        'date_fin' => $sundayLastWeek->format('Y-m-d'),
    ];
}

/**
 * @return list<string>
 */
function generate_weekly_telegram_lots(PDO $pdo, string $dateDebut, string $dateFin): array
{
    $sources = $pdo->query(
        "SELECT * FROM collect_sources
         WHERE source_type IN ('telegram','Telegram') AND enabled = 1 ORDER BY id ASC"
    )->fetchAll();
    $created = [];
    foreach ($sources as $source) {
        $res = tg_aggregate_source($pdo, $source, 'live', $dateDebut, $dateFin);
        if ($res['lot_id'] !== null) {
            $created[] = $res['lot_id'];
        }
    }
    return $created;
}
