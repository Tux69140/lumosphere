<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../../api/dal/citations.php';
require_once __DIR__ . '/../../api/dal/roles.php';

/**
 * Role-based access tests: visiteur, éditeur, admin, Abo3.
 */
final class RolesAccessTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = get_test_pdo();
        $this->pdo->beginTransaction();
    }

    protected function tearDown(): void
    {
        $this->pdo->rollBack();
    }

    public function test_visiteur_sees_only_published_citations(): void
    {
        $ctx = create_test_ctx(ROLE_VISITEUR, null);
        $result = dal_find_citations($this->pdo, $ctx);
        $this->assertSame('ok', $result['status']);
        foreach ($result['data']['items'] as $item) {
            $this->assertSame(ETAT_PUBLIEE, (int) $item['etat_id']);
        }
    }

    public function test_editeur_sees_all_states(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR, 2);
        $result = dal_find_citations($this->pdo, $ctx);
        $this->assertSame('ok', $result['status']);
        // Éditeur has corpus.read_all — no etat filter applied
        $this->assertArrayHasKey('items', $result['data']);
    }

    public function test_admin_role_cannot_be_deleted(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN, 1);
        $result = dal_delete_role($this->pdo, $ctx, ROLE_ADMIN);
        $this->assertSame('error', $result['status']);
        $this->assertStringContainsString('Administrateur', $result['errors'][0]);
    }

    public function test_visiteur_cannot_write_citation(): void
    {
        $this->expectException(RuntimeException::class);
        $ctx = create_test_ctx(ROLE_VISITEUR, null);
        dal_create_citation($this->pdo, $ctx, [
            'contenu'   => 'Should fail',
            'oeuvre_id' => 1,
        ]);
    }
}
