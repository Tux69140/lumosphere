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

function dal_ok(mixed $data = null): array
{
    return ['status' => 'ok', 'data' => $data, 'errors' => []];
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
 * R8 — Œuvre visibility fragment (no état): public works plus works reserved
 * to this role. Abo4 cumulates Abo3+Abo4 (business decision T14).
 * Returns '' for roles with corpus.read_all.
 */
function dal_oeuvre_visibility_clause(string $oeuvre_col, array $ctx, array &$params): string
{
    if (in_array('corpus.read_all', $ctx['permissions'] ?? [], true)) {
        return '';
    }
    $role_id  = $ctx['role_id'] ?? ROLE_VISITEUR;
    $reserved = 'SELECT oeuvre_id FROM role_oeuvre_access';

    if ($role_id === ROLE_ABO4) {
        // Cumul Abo3+Abo4 conservé (décision métier T14).
        $params[':ctx_abo3'] = ROLE_ABO3;
        $params[':ctx_abo4'] = ROLE_ABO4;
        return " AND ({$oeuvre_col} NOT IN ({$reserved})"
             . " OR {$oeuvre_col} IN (SELECT oeuvre_id FROM role_oeuvre_access WHERE role_id IN (:ctx_abo3, :ctx_abo4)))";
    }

    // Tout autre rôle (Abo3, Visiteur, rôles personnalisés) :
    // œuvres publiques + réservées spécifiquement à CE rôle.
    $params[':ctx_role'] = $role_id;
    return " AND ({$oeuvre_col} NOT IN ({$reserved})"
         . " OR {$oeuvre_col} IN (SELECT oeuvre_id FROM role_oeuvre_access WHERE role_id = :ctx_role))";
}

/**
 * R8 — Rights filter per oeuvre, appended to every SELECT on citations.
 * corpus.read_all → no restriction. Otherwise: Publiée only + œuvre visibility.
 */
function dal_oeuvre_access_clause(string $oeuvre_col, array $ctx, array &$params, string $etat_col = 'c.etat_id'): string
{
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
