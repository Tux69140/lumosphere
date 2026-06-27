<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../../api/dal/roles.php';

final class RolesTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = get_test_pdo();
        reset_test_db($this->pdo);
        seed_default_roles($this->pdo);
    }

    public function test_find_roles_returns_5(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_find_roles($this->pdo, $ctx);
        $this->assertSame('ok', $r['status']);
        $this->assertCount(5, $r['data']);
    }

    public function test_get_role_with_permissions_admin_has_16(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_get_role_with_permissions($this->pdo, $ctx, ROLE_ADMIN);
        $this->assertSame('ok', $r['status']);
        $this->assertSame('Administrateur', $r['data']['nom']);
        $this->assertCount(16, $r['data']['permissions']);
    }

    public function test_get_role_visiteur_has_1_permission(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_get_role_with_permissions($this->pdo, $ctx, ROLE_VISITEUR);
        $this->assertSame('ok', $r['status']);
        $this->assertCount(1, $r['data']['permissions']);
        $this->assertSame('corpus.read', $r['data']['permissions'][0]['code']);
    }

    /** R4 — Cannot delete Administrateur */
    public function test_delete_admin_role_blocked(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_delete_role($this->pdo, $ctx, ROLE_ADMIN);
        $this->assertSame('error', $r['status']);
        $this->assertStringContainsString('Administrateur', $r['errors'][0]);
    }

    /** R4 — Cannot modify Administrateur permissions */
    public function test_update_admin_permissions_blocked(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_update_role_permissions($this->pdo, $ctx, ROLE_ADMIN, [1, 2]);
        $this->assertSame('error', $r['status']);
        $this->assertStringContainsString('Administrateur', $r['errors'][0]);
    }

    public function test_update_editeur_permissions_works(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        // Set Éditeur to only permission 1
        $r = dal_update_role_permissions($this->pdo, $ctx, ROLE_EDITEUR, [1]);
        $this->assertSame('ok', $r['status']);

        // Verify
        $r = dal_get_role_with_permissions($this->pdo, $ctx, ROLE_EDITEUR);
        $this->assertCount(1, $r['data']['permissions']);

        // Restore original permissions
        dal_update_role_permissions($this->pdo, $ctx, ROLE_EDITEUR, [1,2,3,4,8,9,10,11,12,13,14]);
    }

    public function test_create_role_with_permissions(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_create_role($this->pdo, $ctx, 'Testeur', [1, 3]);
        $this->assertSame('ok', $r['status']);
        $this->assertIsInt($r['data']['id']);
        $this->assertSame('Testeur', $r['data']['nom']);

        // Vérifier que les permissions sont bien enregistrées
        $r2 = dal_get_role_with_permissions($this->pdo, $ctx, $r['data']['id']);
        $this->assertCount(2, $r2['data']['permissions']);
    }

    public function test_create_role_empty_nom_rejected(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_create_role($this->pdo, $ctx, '   ', [1]);
        $this->assertSame('error', $r['status']);
    }

    public function test_update_role_nom(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_update_role($this->pdo, $ctx, ROLE_VISITEUR, 'Visiteur Renommé');
        $this->assertSame('ok', $r['status']);
        $this->assertSame('Visiteur Renommé', $r['data']['nom']);
    }

    public function test_update_admin_role_blocked(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_update_role($this->pdo, $ctx, ROLE_ADMIN, 'Nouveau Nom');
        $this->assertSame('error', $r['status']);
        $this->assertStringContainsString('Administrateur', $r['errors'][0]);
    }
}
