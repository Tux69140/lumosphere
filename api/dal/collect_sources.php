<?php

declare(strict_types=1);

function dal_find_collect_sources(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'oeuvres.manage');
    $stmt = $pdo->query(
        'SELECT id, label, source_type FROM collect_sources ORDER BY label'
    );
    return dal_ok($stmt->fetchAll());
}

/**
 * Présente une ligne collect_sources pour l'admin : décode le chat_id rangé dans
 * config_json et normalise les types (bool / int / null) pour le frontend.
 */
function _dal_present_collect_source(array $row): array
{
    $config = json_decode((string) ($row['config_json'] ?? '{}'), true);
    $row['chat_id'] = isset($config['chat_id']) ? (int) $config['chat_id'] : null;
    $row['enabled'] = (int) $row['enabled'] === 1;
    $row['run_every_hours'] = (int) $row['run_every_hours'];
    $row['oeuvre_id'] = $row['oeuvre_id'] !== null ? (int) $row['oeuvre_id'] : null;
    unset($row['config_json']);
    return $row;
}

const COLLECT_SOURCE_ADMIN_COLS =
    'id, label, source_type, config_json, enabled, run_every_hours, oeuvre_id, last_run_at, last_error';

/**
 * Liste détaillée des canaux Telegram (vue admin « Sources »).
 */
function dal_list_telegram_channels(PDO $pdo, array $ctx): array
{
    dal_require_permission($ctx, 'admin.settings');
    $stmt = $pdo->query(
        'SELECT ' . COLLECT_SOURCE_ADMIN_COLS
        . " FROM collect_sources WHERE source_type = 'telegram' ORDER BY label"
    );
    return dal_ok(array_map('_dal_present_collect_source', $stmt->fetchAll()));
}

function dal_get_collect_source(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'admin.settings');
    $stmt = $pdo->prepare(
        'SELECT ' . COLLECT_SOURCE_ADMIN_COLS . ' FROM collect_sources WHERE id = :id'
    );
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    return $row ? dal_ok(_dal_present_collect_source($row)) : dal_error('Canal introuvable.');
}

/**
 * Valide les champs d'un canal Telegram. En création, label et chat_id sont requis ;
 * en modification, on ne valide que les champs effectivement fournis.
 *
 * @return string[] liste des messages d'erreur (vide si tout est valide)
 */
function _dal_validate_telegram_source(PDO $pdo, array $data, bool $is_create): array
{
    $errors = [];

    if ($is_create || array_key_exists('label', $data)) {
        if (trim((string) ($data['label'] ?? '')) === '') {
            $errors[] = 'Le nom du canal est requis.';
        }
    }

    if ($is_create || array_key_exists('chat_id', $data)) {
        $chat = (string) ($data['chat_id'] ?? '');
        // chat_id Telegram = entier, souvent négatif (ex. -1001234567890).
        if (!preg_match('/^-?\d+$/', $chat)) {
            $errors[] = 'L\'identifiant du canal (chat_id) doit être un nombre entier.';
        }
    }

    if (array_key_exists('run_every_hours', $data)
        && $data['run_every_hours'] !== null && $data['run_every_hours'] !== '') {
        $h = (string) $data['run_every_hours'];
        if (!preg_match('/^\d+$/', $h) || (int) $h > 255) {
            $errors[] = 'Le délai doit être un nombre d\'heures entre 0 et 255.';
        }
    }

    if (array_key_exists('oeuvre_id', $data)
        && $data['oeuvre_id'] !== null && $data['oeuvre_id'] !== '') {
        $stmt = $pdo->prepare('SELECT id FROM oeuvres WHERE id = :id');
        $stmt->execute(['id' => (int) $data['oeuvre_id']]);
        if (!$stmt->fetch()) {
            $errors[] = 'Œuvre introuvable.';
        }
    }

    return $errors;
}

function dal_create_collect_source(PDO $pdo, array $ctx, array $data): array
{
    dal_require_permission($ctx, 'admin.settings');

    $errors = _dal_validate_telegram_source($pdo, $data, true);
    if ($errors) {
        return dal_error($errors);
    }

    $oeuvre_id = (isset($data['oeuvre_id']) && $data['oeuvre_id'] !== '' && $data['oeuvre_id'] !== null)
        ? (int) $data['oeuvre_id'] : null;

    $stmt = $pdo->prepare(
        'INSERT INTO collect_sources (source_type, label, config_json, enabled, run_every_hours, oeuvre_id)'
        . ' VALUES (:type, :label, :config, :enabled, :run_every, :oeuvre)'
    );
    $stmt->execute([
        'type'      => 'telegram',
        'label'     => trim((string) $data['label']),
        'config'    => json_encode(['chat_id' => (int) $data['chat_id']], JSON_THROW_ON_ERROR),
        'enabled'   => !empty($data['enabled']) ? 1 : 0,
        'run_every' => isset($data['run_every_hours']) && $data['run_every_hours'] !== ''
            ? (int) $data['run_every_hours'] : 12,
        'oeuvre'    => $oeuvre_id,
    ]);
    return dal_ok(['id' => (int) $pdo->lastInsertId()]);
}

function dal_update_collect_source(PDO $pdo, array $ctx, int $id, array $data): array
{
    dal_require_permission($ctx, 'admin.settings');

    $stmt = $pdo->prepare("SELECT config_json FROM collect_sources WHERE id = :id AND source_type = 'telegram'");
    $stmt->execute(['id' => $id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        return dal_error('Canal introuvable.');
    }

    $errors = _dal_validate_telegram_source($pdo, $data, false);
    if ($errors) {
        return dal_error($errors);
    }

    $params = ['id' => $id];
    $fields = [];
    if (array_key_exists('label', $data)) {
        $fields[] = 'label = :label';
        $params['label'] = trim((string) $data['label']);
    }
    if (array_key_exists('enabled', $data)) {
        $fields[] = 'enabled = :enabled';
        $params['enabled'] = !empty($data['enabled']) ? 1 : 0;
    }
    if (array_key_exists('run_every_hours', $data)) {
        $fields[] = 'run_every_hours = :run_every';
        $params['run_every'] = (int) $data['run_every_hours'];
    }
    if (array_key_exists('oeuvre_id', $data)) {
        $fields[] = 'oeuvre_id = :oeuvre';
        $params['oeuvre'] = ($data['oeuvre_id'] === '' || $data['oeuvre_id'] === null)
            ? null : (int) $data['oeuvre_id'];
    }
    if (array_key_exists('chat_id', $data)) {
        // Fusionner dans le config_json existant pour préserver les autres clés
        // (canal, author_name, bot_username, bot_label, …) renseignées ailleurs.
        $config = json_decode((string) ($existing['config_json'] ?? '{}'), true);
        if (!is_array($config)) {
            $config = [];
        }
        $config['chat_id'] = (int) $data['chat_id'];
        $fields[] = 'config_json = :config';
        $params['config'] = json_encode($config, JSON_THROW_ON_ERROR);
    }

    if (empty($fields)) {
        return dal_error('Aucun champ à mettre à jour.');
    }

    $sql = 'UPDATE collect_sources SET ' . implode(', ', $fields) . ' WHERE id = :id';
    $pdo->prepare($sql)->execute($params);
    return dal_ok(['id' => $id]);
}

function dal_delete_collect_source(PDO $pdo, array $ctx, int $id): array
{
    dal_require_permission($ctx, 'admin.settings');
    try {
        $stmt = $pdo->prepare("DELETE FROM collect_sources WHERE id = :id AND source_type = 'telegram'");
        $stmt->execute(['id' => $id]);
        return $stmt->rowCount() > 0 ? dal_ok() : dal_error('Canal introuvable.');
    } catch (\PDOException $e) {
        if ($e->getCode() === '23000') {
            return dal_error('Ce canal est référencé ailleurs et ne peut être supprimé.');
        }
        throw $e;
    }
}

function dal_link_oeuvre_source(PDO $pdo, array $ctx, int $oeuvre_id, ?int $source_id): array
{
    dal_require_permission($ctx, 'oeuvres.manage');

    $stmt = $pdo->prepare('SELECT id FROM oeuvres WHERE id = :id');
    $stmt->execute(['id' => $oeuvre_id]);
    if (!$stmt->fetch()) {
        return dal_error('Œuvre introuvable.');
    }

    if ($source_id !== null) {
        $stmt = $pdo->prepare('SELECT id FROM collect_sources WHERE id = :id');
        $stmt->execute(['id' => $source_id]);
        if (!$stmt->fetch()) {
            return dal_error('Source introuvable.');
        }
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE collect_sources SET oeuvre_id = NULL WHERE oeuvre_id = :oeuvre_id')
            ->execute(['oeuvre_id' => $oeuvre_id]);

        if ($source_id !== null) {
            $pdo->prepare('UPDATE collect_sources SET oeuvre_id = :oeuvre_id WHERE id = :id')
                ->execute(['oeuvre_id' => $oeuvre_id, 'id' => $source_id]);
        }

        $pdo->commit();
    } catch (\Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    return dal_ok();
}
