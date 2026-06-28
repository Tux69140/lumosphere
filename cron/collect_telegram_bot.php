<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap_cron.php';
require_once __DIR__ . '/lib/telegram_pipeline.php';

try {
    $stored = tg_collect_into_buffer($pdo, $config, 'live');
    echo "Updates Telegram stockees: $stored\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, 'Erreur collecteur Telegram: ' . $e->getMessage() . "\n");
    exit(1);
}
