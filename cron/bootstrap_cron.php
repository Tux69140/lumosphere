<?php

declare(strict_types=1);

/**
 * Bootstrap allégé pour les scripts cron.
 * Pas de session, pas de CORS, pas de CSRF, pas de routing.
 */

$configPath = dirname(__DIR__) . '/config/config.php';
if (!is_file($configPath)) {
    fwrite(STDERR, "config.php introuvable : $configPath\n");
    exit(1);
}

$config = require $configPath;
date_default_timezone_set($config['timezone'] ?? 'Europe/Paris');

require_once dirname(__DIR__) . '/api/dal/core.php';
$pdo = dal_get_pdo($config);
