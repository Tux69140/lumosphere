<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/dal/collecte.php';

function endpoint_collecte(PDO $pdo, array $ctx, string $method, ?int $id, ?array $body, ?string $action): array
{
    if ($method !== 'POST') {
        return dal_error('Méthode non supportée.');
    }
    $config = require dirname(__DIR__, 2) . '/config/config.php';

    return match ($action) {
        'run'   => dal_collecte_run($pdo, $ctx, $config),
        'topup' => dal_collecte_topup($pdo, $ctx, (int) ($body['more'] ?? 0)),
        default => dal_error('Action de collecte inconnue.'),
    };
}
