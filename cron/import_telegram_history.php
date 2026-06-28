<?php

declare(strict_types=1);

/**
 * Import d'un export Telegram Desktop (JSON) dans la réserve, origine 'historique'.
 * Usage : php cron/import_telegram_history.php <collect_source_id> <export.json> [export2.json ...]
 */

require_once __DIR__ . '/bootstrap_cron.php';
require_once __DIR__ . '/lib/telegram_pipeline.php';

$args = array_slice($argv, 1);
if (count($args) < 2) {
    fwrite(STDERR, "Usage: php import_telegram_history.php <source_id> <export.json> [...]\n");
    exit(1);
}
$sourceId = (int) array_shift($args);

try {
    $source = $pdo->prepare("SELECT * FROM collect_sources WHERE id = ? AND source_type IN ('telegram','Telegram')");
    $source->execute([$sourceId]);
    $row = $source->fetch();
    if (!$row) {
        throw new RuntimeException("Source Telegram #$sourceId introuvable.");
    }
    $chatId = (int) (json_decode((string) $row['config_json'], true)['chat_id'] ?? 0);

    $ins = $pdo->prepare(
        "INSERT IGNORE INTO telegram_updates_buffer
         (collect_source_id, origin, update_id, message_id, chat_id, message_date, payload_json)
         VALUES (?, 'historique', ?, ?, ?, ?, ?)"
    );

    $total = 0;
    $stored = 0;
    foreach ($args as $file) {
        if (!is_file($file)) {
            throw new RuntimeException("Fichier introuvable: $file");
        }
        $json = json_decode((string) file_get_contents($file), true);
        if (!is_array($json)) {
            throw new RuntimeException("JSON invalide: $file");
        }
        foreach (tg_parse_telegram_export($json) as $msg) {
            $total++;
            $date = (new DateTimeImmutable($msg['date']))->format('Y-m-d H:i:s');
            $payload = json_encode([
                'message_id' => $msg['message_id'],
                'date' => (new DateTimeImmutable($msg['date']))->format('c'),
                'text' => $msg['text'],
                'entities' => [],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            // update_id synthétique négatif pour ne pas heurter les offsets live
            $ins->execute([$sourceId, -$msg['message_id'], $msg['message_id'], $chatId, $date, $payload]);
            $stored += $ins->rowCount();
        }
    }

    $pdo->prepare("UPDATE collect_sources SET history_import_enabled = 1 WHERE id = ?")->execute([$sourceId]);

    echo "Historique importé: $stored nouveaux / $total lus (source #$sourceId). Tapis roulant activé.\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Erreur import historique: ' . $e->getMessage() . "\n");
    exit(1);
}
