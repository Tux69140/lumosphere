<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';

final class CoreTest extends TestCase
{
    public function test_dal_ok_format(): void
    {
        $r = dal_ok(['id' => 1]);
        $this->assertSame('ok', $r['status']);
        $this->assertSame(['id' => 1], $r['data']);
        $this->assertSame([], $r['errors']);
    }

    public function test_dal_ok_null(): void
    {
        $r = dal_ok();
        $this->assertNull($r['data']);
    }

    public function test_dal_error_string(): void
    {
        $r = dal_error('Boom');
        $this->assertSame('error', $r['status']);
        $this->assertNull($r['data']);
        $this->assertSame(['Boom'], $r['errors']);
    }

    public function test_dal_error_array(): void
    {
        $r = dal_error(['A', 'B']);
        $this->assertSame(['A', 'B'], $r['errors']);
    }

    public function test_require_permission_passes(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        dal_require_permission($ctx, 'corpus.write');
        $this->assertTrue(true);
    }

    public function test_require_permission_throws(): void
    {
        $ctx = create_test_ctx(ROLE_VISITEUR);
        $this->expectException(RuntimeException::class);
        dal_require_permission($ctx, 'corpus.write');
    }

    // R7 — Soft-delete clause
    public function test_soft_delete_clause_normal_user(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        $this->assertSame(' AND c.deleted_at IS NULL', dal_soft_delete_clause('c', $ctx));
    }

    public function test_soft_delete_clause_admin_include_deleted(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN, 1, true);
        $this->assertSame('', dal_soft_delete_clause('c', $ctx));
    }

    public function test_soft_delete_clause_non_admin_include_deleted_still_filters(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR, 2, true);
        $this->assertSame(' AND c.deleted_at IS NULL', dal_soft_delete_clause('c', $ctx));
    }

    // R8 — Oeuvre access clause
    public function test_oeuvre_access_clause_admin(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $params = [];
        $this->assertSame('', dal_oeuvre_access_clause('c.oeuvre_id', $ctx, $params));
        $this->assertEmpty($params);
    }

    public function test_oeuvre_access_clause_editeur(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        $params = [];
        $this->assertSame('', dal_oeuvre_access_clause('c.oeuvre_id', $ctx, $params));
    }

    public function test_oeuvre_access_clause_visiteur(): void
    {
        $ctx = create_test_ctx(ROLE_VISITEUR, null);
        $params = [];
        $clause = dal_oeuvre_access_clause('c.oeuvre_id', $ctx, $params);
        $this->assertStringContainsString('etat_id = ' . ETAT_PUBLIEE, $clause);
        $this->assertArrayHasKey(':ctx_role', $params);
        $this->assertSame(ROLE_VISITEUR, $params[':ctx_role']);
    }

    public function test_oeuvre_access_clause_abo3(): void
    {
        $ctx = create_test_ctx(ROLE_ABO3, 10);
        $params = [];
        $clause = dal_oeuvre_access_clause('c.oeuvre_id', $ctx, $params);
        $this->assertStringContainsString('role_oeuvre_access', $clause);
        $this->assertStringContainsString('etat_id = ' . ETAT_PUBLIEE, $clause);
        $this->assertArrayHasKey(':ctx_role', $params);
        $this->assertSame(ROLE_ABO3, $params[':ctx_role']);
    }

    // R9 — Keyset pagination
    public function test_encode_decode_cursor_roundtrip(): void
    {
        $cursor = dal_encode_cursor('2026-06-22', 42);
        $decoded = dal_decode_cursor($cursor);
        $this->assertSame('2026-06-22', $decoded['sort_value']);
        $this->assertSame(42, $decoded['id']);
    }

    public function test_decode_cursor_null(): void
    {
        $this->assertNull(dal_decode_cursor(null));
        $this->assertNull(dal_decode_cursor(''));
    }

    public function test_decode_cursor_invalid(): void
    {
        $this->assertNull(dal_decode_cursor('not-valid-base64!!!'));
        $this->assertNull(dal_decode_cursor(base64_encode('not-json')));
        $this->assertNull(dal_decode_cursor(base64_encode('[1]')));
    }

    public function test_keyset_clause_no_cursor(): void
    {
        $params = [];
        $this->assertSame('', dal_keyset_clause('c.date_entree', 'c.id', null, 'DESC', $params));
        $this->assertEmpty($params);
    }

    public function test_keyset_clause_with_cursor_desc(): void
    {
        $cursor = ['sort_value' => '2026-06-22', 'id' => 42];
        $params = [];
        $clause = dal_keyset_clause('c.date_entree', 'c.id', $cursor, 'DESC', $params);
        $this->assertStringContainsString('<', $clause);
        $this->assertSame('2026-06-22', $params[':cursor_sort1']);
        $this->assertSame(42, $params[':cursor_id']);
    }

    public function test_keyset_clause_with_cursor_asc(): void
    {
        $cursor = ['sort_value' => '2026-01-01', 'id' => 1];
        $params = [];
        $clause = dal_keyset_clause('c.date_entree', 'c.id', $cursor, 'ASC', $params);
        $this->assertStringContainsString('>', $clause);
    }
}
