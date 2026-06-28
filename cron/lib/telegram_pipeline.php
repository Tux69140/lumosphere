<?php

declare(strict_types=1);

/**
 * Module partagé de la chaîne Telegram (collecte / agrégation / réappro).
 * Appelé par les crons ET l'endpoint /api/collecte.
 */

/**
 * Groupe des messages par semaine ISO (lundi→dimanche), plus ancienne d'abord.
 *
 * @param list<array{message_id:int,date:string,text:string}> $messages
 * @return list<array{week_key:string,date_debut:string,date_fin:string,messages:list<array>}>
 */
function tg_slice_messages_by_week(array $messages): array
{
    $groups = [];
    foreach ($messages as $msg) {
        $date = new \DateTimeImmutable((string) $msg['date']);
        $weekKey = $date->format('o-\WW'); // ex. 2026-W26
        if (!isset($groups[$weekKey])) {
            $monday = $date->modify('monday this week')->setTime(0, 0, 0);
            $sunday = $monday->modify('+6 days');
            $groups[$weekKey] = [
                'week_key'   => $weekKey,
                'date_debut' => $monday->format('Y-m-d'),
                'date_fin'   => $sunday->format('Y-m-d'),
                'messages'   => [],
            ];
        }
        $groups[$weekKey]['messages'][] = $msg;
    }
    ksort($groups); // ordre chronologique par clé ISO
    return array_values($groups);
}

/**
 * Normalise un export Telegram Desktop (JSON décodé) en messages texte.
 *
 * @param array $json  Contenu décodé (clé "messages")
 * @return list<array{message_id:int,date:string,text:string}>
 */
function tg_parse_telegram_export(array $json): array
{
    $out = [];
    foreach ($json['messages'] ?? [] as $m) {
        if (($m['type'] ?? '') !== 'message') {
            continue; // ignore les messages de service
        }
        $text = tg_flatten_export_text($m['text'] ?? '');
        if (trim($text) === '') {
            continue; // ignore les médias seuls / vides
        }
        $out[] = [
            'message_id' => (int) ($m['id'] ?? 0),
            'date'       => (string) ($m['date'] ?? ''),
            'text'       => $text,
        ];
    }
    return $out;
}

/** Aplatit le champ "text" (chaîne ou tableau de fragments) en texte brut. */
function tg_flatten_export_text(mixed $text): string
{
    if (is_string($text)) {
        return $text;
    }
    if (!is_array($text)) {
        return '';
    }
    $parts = [];
    foreach ($text as $frag) {
        if (is_string($frag)) {
            $parts[] = $frag;
        } elseif (is_array($frag) && isset($frag['text'])) {
            $parts[] = (string) $frag['text'];
        }
    }
    return implode('', $parts);
}

/**
 * Génère un lot_id séquentiel au format `<prefix>_<YYYYMMDD>_NNN`.
 */
function tg_next_lot_id(PDO $pdo, string $prefix, string $date): string
{
    $base = $prefix . '_' . str_replace('-', '', $date);
    $stmt = $pdo->prepare("SELECT lot_id FROM lots WHERE lot_id LIKE ? ORDER BY lot_id DESC LIMIT 1");
    $stmt->execute([$base . '%']);
    $last = $stmt->fetchColumn();
    if ($last) {
        $parts = explode('_', (string) $last);
        $seq = (int) end($parts) + 1;
    } else {
        $seq = 1;
    }
    return $base . '_' . str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
}

/**
 * Crée 1 lot (+documents+job) depuis le tampon d'une source, filtré par origine.
 *
 * @param PDO     $pdo       Connexion PDO (peut déjà être dans une transaction — guard inTransaction())
 * @param array   $source    Ligne collect_sources
 * @param string  $origin    'live' ou 'historique'
 * @param ?string $date_from Borne de début (YYYY-MM-DD) ou null = pas de filtre
 * @param ?string $date_to   Borne de fin  (YYYY-MM-DD) ou null = pas de filtre
 * @return array{lot_id:?string,documents:int}
 */
function tg_aggregate_source(PDO $pdo, array $source, string $origin, ?string $date_from, ?string $date_to): array
{
    $sql = "SELECT * FROM telegram_updates_buffer
            WHERE collect_source_id = ? AND origin = ? AND buffer_status = 'buffered'";
    $params = [(int) $source['id'], $origin];
    if ($date_from !== null && $date_to !== null) {
        $sql .= " AND DATE(message_date) BETWEEN ? AND ?";
        $params[] = $date_from;
        $params[] = $date_to;
    }
    $sql .= " ORDER BY message_date ASC, message_id ASC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    if (count($rows) === 0) {
        return ['lot_id' => null, 'documents' => 0];
    }

    $messages = [];
    $bufferIds = [];
    foreach ($rows as $row) {
        $payload = json_decode((string) $row['payload_json'], true);
        if (is_array($payload) && trim((string) ($payload['text'] ?? '')) !== '') {
            $messages[] = $payload;
        }
        $bufferIds[] = (int) $row['id'];
    }
    if (count($messages) === 0) {
        return ['lot_id' => null, 'documents' => 0];
    }

    // config_json n'existe pas toujours dans collect_sources — fallback gracieux
    $configJson = json_decode((string) ($source['config_json'] ?? '{}'), true) ?: [];
    $canal = trim((string) ($configJson['canal'] ?? $messages[0]['chat_username'] ?? ''));
    $oeuvreId = isset($configJson['oeuvre_id']) ? (int) $configJson['oeuvre_id'] : null;

    $dates = [
        substr((string) ($messages[0]['date'] ?? ''), 0, 10),
        substr((string) ($messages[count($messages) - 1]['date'] ?? ''), 0, 10),
    ];
    $debut = $date_from ?? ($dates[0] ?: date('Y-m-d'));
    $fin   = $date_to   ?? ($dates[1] ?: $debut);

    $prefix = $origin === 'historique' ? 'telegram_hist' : 'telegram';
    $lotId  = tg_next_lot_id($pdo, $prefix, $debut);
    $titrePrefix = $origin === 'historique' ? 'Telegram historique Lulumineuse' : 'Telegram Lulumineuse';
    $title  = "$titrePrefix $debut - $fin";

    // Guard : si l'appelant gère déjà une transaction (ex. tests), ne pas en ouvrir une nouvelle
    $ownTx = !$pdo->inTransaction();
    if ($ownTx) {
        $pdo->beginTransaction();
    }
    try {
        $pdo->prepare(
            'INSERT INTO lots (lot_id, source_type, titre_lot, status, date_source_debut, date_source_fin)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$lotId, 'telegram', $title, 'en_attente', $debut, $fin]);

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
            $docStmt->execute([
                $lotId,
                mb_substr($text, 0, 80, 'UTF-8'),
                'telegram',
                'en_attente',
                (string) ($msg['message_id'] ?? ''),
                $text,
                hash('sha256', $text),
                isset($msg['date']) ? substr((string) $msg['date'], 0, 10) : null,
                $oeuvreId,
            ]);
            $docCount++;
        }

        $placeholders = implode(',', array_fill(0, count($bufferIds), '?'));
        $pdo->prepare("UPDATE telegram_updates_buffer SET buffer_status='lot_created', lot_id=? WHERE id IN ($placeholders)")
            ->execute([$lotId, ...$bufferIds]);

        $pdo->prepare(
            "INSERT INTO journal_events (lot_id, action, old_status, new_status, actor, message)
             VALUES (?, 'creation_lot_telegram', NULL, 'en_attente', 'system', ?)"
        )->execute([$lotId, "Lot Telegram ($origin) $docCount message(s) depuis le tampon"]);

        $jobId = 'job_' . uniqid('', true);
        $pdo->prepare(
            "INSERT INTO server_jobs (job_id, lot_id, job_type, status, priority, payload_json)
             VALUES (?, ?, 'process_telegram_v2', 'queued', 6, ?)"
        )->execute([
            $jobId,
            $lotId,
            json_encode(
                ['canal' => $canal, 'date_debut' => $debut, 'date_fin' => $fin],
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            ),
        ]);

        if ($ownTx) {
            $pdo->commit();
        }
        return ['lot_id' => $lotId, 'documents' => $docCount];
    } catch (\Throwable $e) {
        if ($ownTx) {
            $pdo->rollBack();
        }
        throw $e;
    }
}
