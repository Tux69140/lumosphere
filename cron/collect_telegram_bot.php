<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap_cron.php';
require_once __DIR__ . '/lib/telegram_pipeline.php';

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
