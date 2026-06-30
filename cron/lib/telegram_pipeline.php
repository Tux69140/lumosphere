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

/**
 * Applique les entités de formatage Telegram (Bot API) à un texte brut
 * pour produire du Markdown CommonMark.
 *
 * Les offsets Telegram sont en UTF-16 code units (un emoji = 2 unités).
 * On construit une table de correspondance UTF-16 → index char Unicode.
 */
function tg_entities_to_markdown(string $text, array $entities): string
{
    if ($text === '' || empty($entities)) {
        return $text;
    }

    $formattingMap = [
        'bold'          => ['**', '**'],
        'italic'        => ['_',  '_'],
        'underline'     => ['<u>', '</u>'],
        'strikethrough' => ['~~', '~~'],
        'code'          => ['`',  '`'],
    ];

    // Filtrer les entités de formatage avec offset+length
    $relevant = array_values(array_filter($entities, fn($e) =>
        is_array($e) &&
        isset($e['type'], $e['offset'], $e['length']) &&
        isset($formattingMap[$e['type']])
    ));

    if (empty($relevant)) {
        return $text;
    }

    // Table UTF-16 offset → index char (mb_str_split = code points Unicode)
    $chars = mb_str_split($text, 1, 'UTF-8');
    $utf16ToChar = [];
    $u16 = 0;
    foreach ($chars as $i => $ch) {
        $utf16ToChar[$u16] = $i;
        $u16 += (mb_ord($ch, 'UTF-8') > 0xFFFF) ? 2 : 1;
    }
    $utf16ToChar[$u16] = count($chars); // sentinelle de fin

    // Construire la liste des insertions [charIndex, marqueur]
    $insertions = [];
    foreach ($relevant as $entity) {
        [$open, $close] = $formattingMap[$entity['type']];
        $start = $utf16ToChar[(int) $entity['offset']] ?? null;
        $end   = $utf16ToChar[(int) $entity['offset'] + (int) $entity['length']] ?? null;
        if ($start === null || $end === null) {
            continue;
        }
        $insertions[] = [$end,   $close, 1]; // fermeture = priorité haute
        $insertions[] = [$start, $open,  0];
    }

    // Trier en ordre décroissant de position pour ne pas décaler les indices
    usort($insertions, fn($a, $b) =>
        $b[0] !== $a[0] ? $b[0] <=> $a[0] : $b[2] <=> $a[2]
    );

    foreach ($insertions as [$pos, $marker]) {
        array_splice($chars, $pos, 0, [$marker]);
    }

    return implode('', $chars);
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
    $mdMap = [
        'bold'          => ['**', '**'],
        'italic'        => ['_',  '_'],
        'underline'     => ['<u>', '</u>'],
        'strikethrough' => ['~~', '~~'],
        'code'          => ['`',  '`'],
    ];
    $parts = [];
    foreach ($text as $frag) {
        if (is_string($frag)) {
            $parts[] = $frag;
        } elseif (is_array($frag) && isset($frag['text'])) {
            $t = (string) $frag['text'];
            $type = (string) ($frag['type'] ?? '');
            if (isset($mdMap[$type])) {
                [$open, $close] = $mdMap[$type];
                $parts[] = $open . $t . $close;
            } else {
                $parts[] = $t;
            }
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
    $indexByMessageId = []; // message_id => [position dans $messages, update_id retenu]
    foreach ($rows as $row) {
        // Toutes les lignes de buffer sont consommées (marquées lot_created), même
        // les versions précédentes d'un message édité.
        $bufferIds[] = (int) $row['id'];

        $payload = json_decode((string) $row['payload_json'], true);
        if (!is_array($payload) || trim((string) ($payload['text'] ?? '')) === '') {
            continue;
        }

        // Dédup par message_id : un message édité revient avec le même message_id
        // mais un update_id plus élevé (edited_channel_post). Le buffer ne déduplique
        // que par update_id, donc on filtre ici en gardant la dernière version.
        $messageId = (int) $row['message_id'];
        $updateId  = (int) $row['update_id'];
        if (isset($indexByMessageId[$messageId])) {
            [$pos, $keptUpdateId] = $indexByMessageId[$messageId];
            if ($updateId >= $keptUpdateId) {
                $messages[$pos] = $payload;
                $indexByMessageId[$messageId] = [$pos, $updateId];
            }
            continue;
        }
        $indexByMessageId[$messageId] = [count($messages), $updateId];
        $messages[] = $payload;
    }
    if (count($messages) === 0) {
        return ['lot_id' => null, 'documents' => 0];
    }

    // config_json n'existe pas toujours dans collect_sources — fallback gracieux
    $configJson = json_decode((string) ($source['config_json'] ?? '{}'), true) ?: [];
    $canal = trim((string) ($configJson['canal'] ?? $messages[0]['chat_username'] ?? ''));
    // L'œuvre cible est une colonne directe de collect_sources (collect_sources.oeuvre_id),
    // pas un champ de config_json : on la propage aux documents pour pré-remplir l'atelier.
    $oeuvreId = isset($source['oeuvre_id']) ? (int) $source['oeuvre_id'] : null;

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

/**
 * Réapprovisionne les lots historiques d'une source jusqu'à $target lots "en_attente".
 * @return array{created:int,pending_weeks:int}
 */
function tg_topup_historical(PDO $pdo, array $source, int $target = 8): array
{
    if ((int) ($source['history_import_enabled'] ?? 0) !== 1) {
        return ['created' => 0, 'pending_weeks' => 0];
    }
    $sid = (int) $source['id'];
    $created = 0;

    $countPending = static function () use ($pdo): int {
        return (int) $pdo->query(
            "SELECT COUNT(*) FROM lots WHERE lot_id LIKE 'telegram_hist_%' AND status = 'en_attente'"
        )->fetchColumn();
    };

    while ($countPending() < $target) {
        // semaine la plus ancienne encore bufferisée
        $stmt = $pdo->prepare(
            "SELECT payload_json FROM telegram_updates_buffer
             WHERE collect_source_id = ? AND origin = 'historique' AND buffer_status = 'buffered'
             ORDER BY message_date ASC, message_id ASC"
        );
        $stmt->execute([$sid]);
        $rows = $stmt->fetchAll();
        if (count($rows) === 0) {
            break; // stock épuisé
        }
        $messages = [];
        foreach ($rows as $r) {
            $p = json_decode((string) $r['payload_json'], true);
            if (is_array($p)) {
                $messages[] = $p;
            }
        }
        $weeks = tg_slice_messages_by_week($messages);
        if (count($weeks) === 0) {
            break;
        }
        $oldest = $weeks[0];
        $res = tg_aggregate_source($pdo, $source, 'historique', $oldest['date_debut'], $oldest['date_fin']);
        if ($res['lot_id'] === null) {
            break; // sécurité anti-boucle
        }
        $created++;
    }

    $remainingCount = (int) $pdo->query(
        "SELECT COUNT(*) FROM telegram_updates_buffer WHERE collect_source_id = $sid AND origin = 'historique' AND buffer_status = 'buffered'"
    )->fetchColumn();

    return ['created' => $created, 'pending_weeks' => $remainingCount > 0 ? 1 : 0];
}

// ---------------------------------------------------------------------------
// Collecte live : helpers déplacés depuis collect_telegram_bot.php (Task 5)
// ---------------------------------------------------------------------------

/**
 * @return list<array<string, mixed>>
 */
function epuriel_telegram_due_sources(PDO $pdo): array
{
    $stmt = $pdo->query(
        "SELECT * FROM collect_sources
         WHERE source_type IN ('telegram', 'Telegram')
           AND enabled = 1
           AND (
             last_run_at IS NULL
             OR TIMESTAMPDIFF(HOUR, last_run_at, NOW()) >= run_every_hours
           )
         ORDER BY id ASC"
    );

    return $stmt->fetchAll();
}

/**
 * @param list<array<string, mixed>> $sources
 */
function epuriel_telegram_next_update_offset(array $sources): ?int
{
    $markers = array_filter(
        array_map(static fn (array $source): ?int => isset($source['last_update_id']) ? (int) $source['last_update_id'] : null, $sources),
        static fn (?int $value): bool => $value !== null && $value > 0
    );

    if (count($markers) === 0) {
        return null;
    }

    return max($markers) + 1;
}

/**
 * @return list<array<string, mixed>>
 */
function epuriel_telegram_get_updates(string $token, ?int $offset): array
{
    $query = [
        'timeout' => 0,
        'limit' => 100,
        'allowed_updates' => json_encode(['channel_post', 'edited_channel_post']),
    ];
    if ($offset !== null) {
        $query['offset'] = $offset;
    }

    $url = 'https://api.telegram.org/bot' . rawurlencode($token) . '/getUpdates?' . http_build_query($query);
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 20,
        ],
    ]);
    $content = file_get_contents($url, false, $context);
    if ($content === false) {
        throw new RuntimeException('Appel getUpdates impossible.');
    }

    $payload = json_decode($content, true);
    if (!is_array($payload) || ($payload['ok'] ?? false) !== true || !is_array($payload['result'] ?? null)) {
        throw new RuntimeException('Reponse getUpdates invalide.');
    }

    return $payload['result'];
}

/**
 * @param list<array<string, mixed>> $sources
 * @param list<array<string, mixed>> $updates
 */
function epuriel_telegram_store_updates(PDO $pdo, array $sources, array $updates, string $origin = 'live'): int
{
    $sourcesByChatId = [];
    foreach ($sources as $source) {
        $sourceConfig = json_decode((string) ($source['config_json'] ?? '{}'), true);
        if (!is_array($sourceConfig)) {
            $sourceConfig = [];
        }
        $chatId = epuriel_telegram_source_chat_id($sourceConfig);
        if ($chatId !== null) {
            $sourcesByChatId[(string) $chatId] = $source;
        }
    }

    $stored = 0;
    $maxUpdateId = null;
    foreach ($updates as $update) {
        if (!is_array($update) || !isset($update['update_id'])) {
            continue;
        }
        $maxUpdateId = max((int) $update['update_id'], (int) ($maxUpdateId ?? 0));

        $message = $update['channel_post'] ?? ($update['edited_channel_post'] ?? null);
        if (!is_array($message)) {
            continue;
        }

        $chat = is_array($message['chat'] ?? null) ? $message['chat'] : [];
        $chatId = isset($chat['id']) ? (int) $chat['id'] : null;
        if ($chatId === null) {
            continue;
        }
        $chatUsername = strtolower(ltrim((string) ($chat['username'] ?? ''), '@'));
        $source = $sourcesByChatId[(string) $chatId] ?? null;
        if (!$source) {
            continue;
        }

        $payload = epuriel_telegram_message_payload($message, (int) $update['update_id']);
        $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payloadJson === false) {
            continue;
        }

        $stmt = $pdo->prepare(
            "INSERT IGNORE INTO telegram_updates_buffer
             (collect_source_id, origin, update_id, message_id, chat_id, chat_username, message_date, payload_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            (int) $source['id'], $origin, (int) $update['update_id'], (int) $message['message_id'],
            $chatId, $chatUsername, date('Y-m-d H:i:s', (int) ($message['date'] ?? time())), $payloadJson,
        ]);
        $stored += $stmt->rowCount();
    }

    foreach ($sources as $source) {
        $stmt = $pdo->prepare('UPDATE collect_sources SET last_run_at = NOW(), last_error = NULL, last_update_id = COALESCE(?, last_update_id) WHERE id = ?');
        $stmt->execute([$maxUpdateId, $source['id']]);
    }

    return $stored;
}

function epuriel_telegram_source_chat_id(array $config): ?int
{
    if (!array_key_exists('chat_id', $config)) {
        return null;
    }

    $rawChatId = $config['chat_id'];
    if (is_int($rawChatId)) {
        return $rawChatId;
    }

    if (is_string($rawChatId) && preg_match('/^-?\d+$/', $rawChatId) === 1) {
        return (int) $rawChatId;
    }

    return null;
}

function epuriel_telegram_message_payload(array $message, ?int $updateId = null): array
{
    $chat = is_array($message['chat'] ?? null) ? $message['chat'] : [];

    // Appliquer le formatage Telegram (entités Bot API) en Markdown avant stockage
    $textMd    = null;
    $captionMd = null;
    if (isset($message['text']) && trim((string) $message['text']) !== '') {
        $textMd = tg_entities_to_markdown(
            (string) $message['text'],
            $message['entities'] ?? []
        );
    }
    if (isset($message['caption']) && trim((string) $message['caption']) !== '') {
        $captionMd = tg_entities_to_markdown(
            (string) $message['caption'],
            $message['caption_entities'] ?? []
        );
    }
    $combinedText = implode("\n\n", array_filter([$textMd, $captionMd], fn($t) => $t !== null));

    $entities = array_merge(
        epuriel_telegram_payload_entities($message['entities'] ?? [], (string) ($message['text'] ?? '')),
        epuriel_telegram_payload_entities($message['caption_entities'] ?? [], (string) ($message['caption'] ?? ''))
    );

    $payload = [
        'message_id' => (int) $message['message_id'],
        'date' => date('c', (int) ($message['date'] ?? time())),
        'chat_id' => $chat['id'] ?? 0,
        'chat_username' => ltrim((string) ($chat['username'] ?? ''), '@'),
        'text' => $combinedText !== '' ? $combinedText : null,
        'entities' => $entities,
    ];

    if ($updateId !== null) {
        $payload['update_id'] = $updateId;
    }

    if (isset($message['forward_from_chat']) && is_array($message['forward_from_chat'])) {
        $payload['forward_from_chat'] = $message['forward_from_chat']['username'] ?? $message['forward_from_chat']['title'] ?? null;
    }
    if (isset($message['forward_date'])) {
        $payload['forward_date'] = date('c', (int) $message['forward_date']);
    }

    return $payload;
}

function epuriel_telegram_payload_entities(mixed $entities, string $text): array
{
    $payloadEntities = [];
    if (!is_array($entities)) {
        return $payloadEntities;
    }

    foreach ($entities as $entity) {
        if (!is_array($entity) || !isset($entity['type'])) {
            continue;
        }
        $payloadEntity = ['type' => (string) $entity['type']];
        if (($entity['type'] ?? '') === 'hashtag' && isset($entity['offset'], $entity['length'])) {
            $payloadEntity['text'] = substr($text, (int) $entity['offset'], (int) $entity['length']);
        }
        if (($entity['type'] ?? '') === 'url' && isset($entity['offset'], $entity['length'])) {
            $payloadEntity['url'] = substr($text, (int) $entity['offset'], (int) $entity['length']);
        }
        if (($entity['type'] ?? '') === 'text_link' && isset($entity['url'])) {
            $payloadEntity['url'] = (string) $entity['url'];
        }
        $payloadEntities[] = $payloadEntity;
    }

    return $payloadEntities;
}

// ---------------------------------------------------------------------------
// Verrou anti-collision + wrapper de collecte (Task 5)
// ---------------------------------------------------------------------------

/** Nom du verrou MySQL par source. */
function tg_source_lock_name(int $source_id): string
{
    return 'tg_source_' . $source_id;
}

/** Exécute $fn sous verrou MySQL par source (refuse si déjà pris). */
function tg_with_source_lock(PDO $pdo, int $source_id, callable $fn): mixed
{
    $name = tg_source_lock_name($source_id);
    $got = (int) $pdo->query("SELECT GET_LOCK(" . $pdo->quote($name) . ", 0)")->fetchColumn();
    if ($got !== 1) {
        throw new RuntimeException('Collecte déjà en cours pour cette source.');
    }
    try {
        return $fn();
    } finally {
        $pdo->query("SELECT RELEASE_LOCK(" . $pdo->quote($name) . ")");
    }
}

/** Collecte getUpdates → réserve (origine paramétrée). Retourne le nb stocké. */
function tg_collect_into_buffer(PDO $pdo, array $config, string $origin = 'live'): int
{
    $token = trim((string) ($config['telegram_bot_token'] ?? ''));
    if ($token === '') {
        throw new RuntimeException('telegram_bot_token absent de config.php');
    }
    $sources = epuriel_telegram_due_sources($pdo);
    if (count($sources) === 0) {
        return 0;
    }
    $offset = epuriel_telegram_next_update_offset($sources);
    $updates = epuriel_telegram_get_updates($token, $offset);
    return epuriel_telegram_store_updates($pdo, $sources, $updates, $origin);
}
