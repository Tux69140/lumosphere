<?php

declare(strict_types=1);

const ROLE_ADMIN    = 1;
const ROLE_EDITEUR  = 2;
const ROLE_VISITEUR = 3;
const ROLE_ABO3     = 4;
const ROLE_ABO4     = 5;

const ETAT_A_CORRIGER = 1;
const ETAT_A_REVISER  = 2;
const ETAT_PUBLIEE    = 3;

const PAGE_SIZE_DEFAULT = 50;
const MAX_PAGE_SIZE     = 100;

function dal_get_pdo(?array $config = null): PDO
{
    static $pdo = null;
    if ($pdo !== null && $config === null) {
        return $pdo;
    }

    if ($config === null) {
        $config = require dirname(__DIR__, 2) . '/config/config.php';
    }

    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4',
        $config['db_host'] ?? '127.0.0.1',
        $config['db_name']
    );

    $instance = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    $pdo = $instance;

    return $instance;
}

function dal_ok(mixed $data = null, ?string $message = null): array
{
    $response = ['status' => 'ok', 'data' => $data, 'errors' => []];
    if ($message !== null) {
        $response['message'] = $message;
    }
    return $response;
}

function dal_error(string|array $errors): array
{
    return ['status' => 'error', 'data' => null, 'errors' => is_array($errors) ? $errors : [$errors]];
}

function dal_require_permission(array $ctx, string $permission_code): void
{
    if (!in_array($permission_code, $ctx['permissions'], true)) {
        throw new RuntimeException("Permission requise : {$permission_code}");
    }
}

/**
 * R7 — Soft-delete filter. Appended to every SELECT on tables with deleted_at.
 */
function dal_soft_delete_clause(string $alias, array $ctx): string
{
    if (($ctx['include_deleted'] ?? false) && ($ctx['role_id'] ?? 0) === ROLE_ADMIN) {
        return '';
    }
    return " AND {$alias}.deleted_at IS NULL";
}

/**
 * R8 — Visibilité par œuvre : publique + autorisée pour ce rôle.
 * Une œuvre "publique" = absente de role_oeuvre_access pour tout rôle.
 * Une œuvre "réservée" = présente dans role_oeuvre_access → visible uniquement
 * aux rôles qui l'ont explicitement dans leur liste.
 * Abo4 cumule Abo3+Abo4. corpus.read_all → aucune restriction.
 */
function dal_oeuvre_visibility_clause(string $oeuvre_col, array $ctx, array &$params): string
{
    if (in_array('corpus.read_all', $ctx['permissions'] ?? [], true)) {
        return '';
    }
    $role_id  = $ctx['role_id'] ?? ROLE_VISITEUR;
    $reserved = 'SELECT oeuvre_id FROM role_oeuvre_access';

    if ($role_id === ROLE_ABO4) {
        $params[':ctx_abo3'] = ROLE_ABO3;
        $params[':ctx_abo4'] = ROLE_ABO4;
        return " AND ({$oeuvre_col} NOT IN ({$reserved})"
             . " OR {$oeuvre_col} IN ("
             . "SELECT oeuvre_id FROM role_oeuvre_access WHERE role_id IN (:ctx_abo3, :ctx_abo4)))";
    }

    $params[':ctx_role'] = $role_id;
    return " AND ({$oeuvre_col} NOT IN ({$reserved})"
         . " OR {$oeuvre_col} IN (SELECT oeuvre_id FROM role_oeuvre_access WHERE role_id = :ctx_role))";
}

/**
 * R8 — Rights filter per oeuvre, appended to every SELECT on citations/oeuvres.
 * corpus.read_all → no restriction. Otherwise: Publiée only + whitelist Visiteur.
 */
function dal_oeuvre_access_clause(
    string $oeuvre_col,
    array $ctx,
    array &$params,
    string $etat_col = 'c.etat_id'
): string {
    if (in_array('corpus.read_all', $ctx['permissions'] ?? [], true)) {
        return '';
    }
    return " AND {$etat_col} = " . ETAT_PUBLIEE . dal_oeuvre_visibility_clause($oeuvre_col, $ctx, $params);
}

/**
 * R9 — Keyset pagination: encode cursor.
 */
function dal_encode_cursor(mixed $sort_value, int $id): string
{
    return base64_encode(json_encode([$sort_value, $id], JSON_THROW_ON_ERROR));
}

/**
 * R9 — Keyset pagination: decode cursor.
 */
function dal_decode_cursor(?string $cursor): ?array
{
    if ($cursor === null || $cursor === '') {
        return null;
    }
    $raw = base64_decode($cursor, true);
    if ($raw === false) {
        return null;
    }
    $arr = json_decode($raw, true);
    if (!is_array($arr) || count($arr) !== 2) {
        return null;
    }
    return ['sort_value' => $arr[0], 'id' => (int) $arr[1]];
}

/**
 * R9 — Keyset pagination: WHERE clause fragment.
 * $direction: 'DESC' or 'ASC'
 */
function dal_keyset_clause(string $sort_col, string $id_col, ?array $cursor, string $direction, array &$params): string
{
    if ($cursor === null) {
        return '';
    }
    $op = ($direction === 'DESC') ? '<' : '>';
    $params[':cursor_sort1'] = $cursor['sort_value'];
    $params[':cursor_sort2'] = $cursor['sort_value'];
    $params[':cursor_id']    = $cursor['id'];
    return " AND ({$sort_col} {$op} :cursor_sort1 OR ({$sort_col} = :cursor_sort2 AND {$id_col} {$op} :cursor_id))";
}

/**
 * Remplace en bloc les lignes d'une table de liaison (DELETE puis ré-INSERT en une
 * seule requête multi-valeurs). À appeler à l'intérieur d'une transaction gérée par
 * l'appelant. $table/$fk_col/$val_col sont des identifiants internes (jamais de saisie
 * client) ; $ids est inséré via des paramètres liés.
 *
 * @param int[] $ids
 */
function _dal_replace_associations(
    PDO $pdo,
    string $table,
    string $fk_col,
    int $fk_id,
    string $val_col,
    array $ids
): void {
    $pdo->prepare("DELETE FROM {$table} WHERE {$fk_col} = :fk")->execute(['fk' => $fk_id]);
    if (empty($ids)) {
        return;
    }
    $placeholders = [];
    $params = [];
    foreach (array_values($ids) as $i => $val) {
        $placeholders[]      = "(:fk_{$i}, :val_{$i})";
        $params["fk_{$i}"]   = $fk_id;
        $params["val_{$i}"]  = (int) $val;
    }
    $sql = "INSERT INTO {$table} ({$fk_col}, {$val_col}) VALUES " . implode(', ', $placeholders);
    $pdo->prepare($sql)->execute($params);
}

/**
 * Construit les fragments « col = :col » pour un UPDATE partiel, en ne retenant que
 * les colonnes autorisées effectivement présentes dans $data, et renseigne $params.
 * La liste blanche $allowed_cols reste de la responsabilité de l'appelant (sécurité).
 *
 * @param string[] $allowed_cols
 * @return string[] fragments SET
 */
function _dal_build_update_fields(array $data, array $allowed_cols, array &$params): array
{
    $fields = [];
    foreach ($allowed_cols as $col) {
        if (array_key_exists($col, $data)) {
            $fields[]     = "{$col} = :{$col}";
            $params[$col] = $data[$col];
        }
    }
    return $fields;
}
