<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap_cron.php';

try {
    $stored = epuriel_run_telegram_collect($pdo, $config);
    echo "Updates Telegram stockees: $stored\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Erreur collecteur Telegram: ' . $e->getMessage() . "\n");
    exit(1);
}

function epuriel_run_telegram_collect(PDO $pdo, array $config): int
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
    return epuriel_telegram_store_updates($pdo, $sources, $updates);
}

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
function epuriel_telegram_store_updates(PDO $pdo, array $sources, array $updates): int
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
             (collect_source_id, update_id, message_id, chat_id, chat_username, message_date, payload_json)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            (int) $source['id'],
            (int) $update['update_id'],
            (int) $message['message_id'],
            $chatId,
            $chatUsername,
            date('Y-m-d H:i:s', (int) ($message['date'] ?? time())),
            $payloadJson,
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
    $textParts = [];
    if (isset($message['text']) && trim((string) $message['text']) !== '') {
        $textParts[] = (string) $message['text'];
    }
    if (isset($message['caption']) && trim((string) $message['caption']) !== '') {
        $textParts[] = (string) $message['caption'];
    }

    $entities = array_merge(
        epuriel_telegram_payload_entities($message['entities'] ?? [], (string) ($message['text'] ?? '')),
        epuriel_telegram_payload_entities($message['caption_entities'] ?? [], (string) ($message['caption'] ?? ''))
    );

    $payload = [
        'message_id' => (int) $message['message_id'],
        'date' => date('c', (int) ($message['date'] ?? time())),
        'chat_id' => $chat['id'] ?? 0,
        'chat_username' => ltrim((string) ($chat['username'] ?? ''), '@'),
        'text' => count($textParts) > 0 ? implode("\n\n", $textParts) : null,
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
