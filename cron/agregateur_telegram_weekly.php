<?php

declare(strict_types=1);

/**
 * Agrégateur Telegram hebdomadaire Lumosphère.
 * Crée un lot par source avec 1 document par message (contenu_brut en base).
 * Déclenche automatiquement le lundi ou sur demande via env FORCE_WEEKLY=1.
 */

require_once __DIR__ . '/bootstrap_cron.php';

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
 * @return list<int>
 */
function generate_weekly_telegram_lots(PDO $pdo, string $dateDebut, string $dateFin): array
{
    $stmt = $pdo->prepare(
        "SELECT * FROM collect_sources
         WHERE source_type IN ('telegram', 'Telegram') AND enabled = 1
         ORDER BY id ASC"
    );
    $stmt->execute();
    $sources = $stmt->fetchAll();

    $createdLots = [];
    foreach ($sources as $source) {
        $lotId = generate_lot_for_source($pdo, $source, $dateDebut, $dateFin);
        if ($lotId !== null) {
            $createdLots[] = $lotId;
        }
    }

    return $createdLots;
}

/**
 * Crée un lot + 1 document par message depuis le tampon.
 * @return int|null ID du lot créé, ou null si aucun message.
 */
function generate_lot_for_source(PDO $pdo, array $source, string $dateDebut, string $dateFin): ?int
{
    $stmt = $pdo->prepare(
        "SELECT * FROM telegram_updates_buffer
         WHERE collect_source_id = ?
           AND buffer_status = 'buffered'
           AND DATE(message_date) BETWEEN ? AND ?
         ORDER BY message_date ASC, message_id ASC"
    );
    $stmt->execute([(int) $source['id'], $dateDebut, $dateFin]);
    $bufferedRows = $stmt->fetchAll();
    if (count($bufferedRows) === 0) {
        return null;
    }

    $messages = [];
    $bufferIds = [];
    foreach ($bufferedRows as $row) {
        $payload = json_decode((string) $row['payload_json'], true);
        if (is_array($payload) && !empty(trim((string) ($payload['text'] ?? '')))) {
            $messages[] = $payload;
        }
        $bufferIds[] = (int) $row['id'];
    }

    if (count($messages) === 0) {
        return null;
    }

    $configJson = json_decode((string) ($source['config_json'] ?? '{}'), true);
    $canal = trim((string) ($configJson['canal'] ?? $messages[0]['chat_username'] ?? ''));
    $oeuvreId = isset($configJson['oeuvre_id']) ? (int) $configJson['oeuvre_id'] : null;
    $lotId = generate_lot_id($pdo, $dateDebut);
    $title = 'Telegram Lulumineuse ' . $dateDebut . ' - ' . $dateFin;

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO lots (lot_id, source_type, titre_lot, status, date_source_debut, date_source_fin)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$lotId, 'telegram', $title, 'en_attente', $dateDebut, $dateFin]);
        $lotPk = (int) $pdo->lastInsertId();

        $docStmt = $pdo->prepare(
            'INSERT INTO documents (lot_id, titre, type_document, status, source_item_id, contenu_brut, hash_contenu, selected, date_publication, oeuvre_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
        );

        $docCount = 0;
        foreach ($messages as $msg) {
            $text = trim((string) ($msg['text'] ?? ''));
            if ($text === '') {
                continue;
            }
            $msgId = (string) ($msg['message_id'] ?? '');
            $msgDate = isset($msg['date']) ? substr((string) $msg['date'], 0, 10) : null;
            $hash = hash('sha256', $text);
            $docTitle = mb_substr($text, 0, 80, 'UTF-8');

            $docStmt->execute([
                $lotId,
                $docTitle,
                'telegram',
                'en_attente',
                $msgId,
                $text,
                $hash,
                $msgDate,
                $oeuvreId,
            ]);
            $docCount++;
        }

        // Marquer les lignes du tampon
        if (!empty($bufferIds)) {
            $placeholders = implode(',', array_fill(0, count($bufferIds), '?'));
            $stmt = $pdo->prepare(
                "UPDATE telegram_updates_buffer SET buffer_status = 'lot_created', lot_id = ? WHERE id IN ({$placeholders})"
            );
            $stmt->execute([$lotId, ...$bufferIds]);
        }

        // Journal
        $pdo->prepare(
            "INSERT INTO journal_events (lot_id, action, old_status, new_status, actor, message)
             VALUES (?, 'creation_lot_telegram', NULL, 'en_attente', 'system', ?)"
        )->execute([$lotId, "Lot Telegram $docCount message(s) cree depuis le tampon bot"]);

        // Job pour le traitement (nettoyage texte)
        $jobId = 'job_' . uniqid('', true);
        $pdo->prepare(
            "INSERT INTO server_jobs (job_id, lot_id, job_type, status, priority, payload_json)
             VALUES (?, ?, 'process_telegram_v2', 'queued', 6, ?)"
        )->execute([
            $jobId,
            $lotId,
            json_encode([
                'canal' => $canal,
                'date_debut' => $dateDebut,
                'date_fin' => $dateFin,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);

        $pdo->commit();
        echo "Lot $lotId cree: $docCount document(s), canal=$canal\n";
        return $lotPk;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function generate_lot_id(PDO $pdo, string $date): string
{
    $prefix = 'telegram_' . str_replace('-', '', $date);
    $stmt = $pdo->prepare("SELECT lot_id FROM lots WHERE lot_id LIKE ? ORDER BY lot_id DESC LIMIT 1");
    $stmt->execute([$prefix . '%']);
    $last = $stmt->fetchColumn();
    if ($last) {
        $parts = explode('_', $last);
        $seq = (int) end($parts) + 1;
    } else {
        $seq = 1;
    }
    return $prefix . '_' . str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
}
