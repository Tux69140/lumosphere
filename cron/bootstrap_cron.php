<?php

/**
 * Bootstrap allégé pour les scripts cron.
 * Pas de session, pas de CORS, pas de CSRF, pas de routing.
 * Expose cron_bootstrap() qui retourne la connexion PDO et la config typées.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/api/dal/core.php';

/**
 * Initialise la configuration et la connexion PDO pour un script cron.
 *
 * @return array{pdo: PDO, config: array<mixed, mixed>}
 */
function cron_bootstrap(): array
{
    $configPath = dirname(__DIR__) . '/config/config.php';
    if (!is_file($configPath)) {
        fwrite(STDERR, "config.php introuvable : $configPath\n");
        exit(1);
    }

    $config = require $configPath;
    if (!is_array($config)) {
        fwrite(STDERR, "config.php invalide : tableau de configuration attendu\n");
        exit(1);
    }

    date_default_timezone_set($config['timezone'] ?? 'Europe/Paris');

    return ['pdo' => dal_get_pdo($config), 'config' => $config];
}
