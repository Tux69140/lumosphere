<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../../api/dal/etats.php';

final class EtatsTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = get_test_pdo();
    }

    public function test_find_etats_returns_3_system_states(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_find_etats($this->pdo, $ctx);
        $this->assertSame('ok', $r['status']);
        $this->assertCount(3, $r['data']);
        $noms = array_column($r['data'], 'nom');
        $this->assertContains('À Corriger', $noms);
        $this->assertContains('À Réviser', $noms);
        $this->assertContains('Publiée', $noms);
    }

    public function test_get_etat_by_id(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_get_etat($this->pdo, $ctx, ETAT_PUBLIEE);
        $this->assertSame('ok', $r['status']);
        $this->assertSame('Publiée', $r['data']['nom']);
        $this->assertSame('P', $r['data']['code']);
    }

    public function test_get_etat_not_found(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_get_etat($this->pdo, $ctx, 999);
        $this->assertSame('error', $r['status']);
    }

    /** R3 — System states cannot be deleted */
    public function test_delete_system_etat_a_corriger_blocked(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_delete_etat($this->pdo, $ctx, ETAT_A_CORRIGER);
        $this->assertSame('error', $r['status']);
        $this->assertStringContainsString('système', $r['errors'][0]);
    }

    public function test_delete_system_etat_a_reviser_blocked(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_delete_etat($this->pdo, $ctx, ETAT_A_REVISER);
        $this->assertSame('error', $r['status']);
    }

    public function test_delete_system_etat_publiee_blocked(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_delete_etat($this->pdo, $ctx, ETAT_PUBLIEE);
        $this->assertSame('error', $r['status']);
    }
}
