<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../../api/dal/themes.php';

final class ThemesTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = get_test_pdo();
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        $this->pdo->exec('DELETE FROM citations');
        $this->pdo->exec('DELETE FROM themes');
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    }

    public function test_create_root_theme(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_create_theme($this->pdo, $ctx, ['nom' => 'Spiritualité']);
        $this->assertSame('ok', $r['status']);

        $stmt = $this->pdo->prepare('SELECT chemin, parent_id FROM themes WHERE id = :id');
        $stmt->execute(['id' => $r['data']['id']]);
        $row = $stmt->fetch();
        $this->assertSame('Spiritualité', $row['chemin']);
        $this->assertNull($row['parent_id']);
    }

    public function test_create_child_theme_chemin_computed(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $parent = dal_create_theme($this->pdo, $ctx, ['nom' => 'Spiritualité']);
        $child = dal_create_theme($this->pdo, $ctx, [
            'nom' => 'Méditation',
            'parent_id' => $parent['data']['id'],
        ]);
        $this->assertSame('ok', $child['status']);

        $stmt = $this->pdo->prepare('SELECT chemin FROM themes WHERE id = :id');
        $stmt->execute(['id' => $child['data']['id']]);
        $this->assertSame('Spiritualité/Méditation', $stmt->fetch()['chemin']);
    }

    /** R5 — grandchild rejected (depth > 2) */
    public function test_create_grandchild_rejected(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $root = dal_create_theme($this->pdo, $ctx, ['nom' => 'Racine']);
        $child = dal_create_theme($this->pdo, $ctx, [
            'nom' => 'Enfant',
            'parent_id' => $root['data']['id'],
        ]);
        $grandchild = dal_create_theme($this->pdo, $ctx, [
            'nom' => 'Petit-enfant',
            'parent_id' => $child['data']['id'],
        ]);
        $this->assertSame('error', $grandchild['status']);
        $this->assertStringContainsString('Profondeur maximale', $grandchild['errors'][0]);
    }

    /** R5 — theme with children cannot become a child */
    public function test_move_theme_with_children_to_child_rejected(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $a = dal_create_theme($this->pdo, $ctx, ['nom' => 'A']);
        $b = dal_create_theme($this->pdo, $ctx, ['nom' => 'B']);
        // A has a child
        dal_create_theme($this->pdo, $ctx, ['nom' => 'A1', 'parent_id' => $a['data']['id']]);

        // Try to make A a child of B
        $r = dal_update_theme($this->pdo, $ctx, $a['data']['id'], ['parent_id' => $b['data']['id']]);
        $this->assertSame('error', $r['status']);
        $this->assertStringContainsString('sous-thèmes', $r['errors'][0]);
    }

    public function test_update_parent_name_cascades_chemin_to_children(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $parent = dal_create_theme($this->pdo, $ctx, ['nom' => 'Ancien']);
        $child = dal_create_theme($this->pdo, $ctx, [
            'nom' => 'Sous',
            'parent_id' => $parent['data']['id'],
        ]);

        dal_update_theme($this->pdo, $ctx, $parent['data']['id'], ['nom' => 'Nouveau']);

        $stmt = $this->pdo->prepare('SELECT chemin FROM themes WHERE id = :id');
        $stmt->execute(['id' => $child['data']['id']]);
        $this->assertSame('Nouveau/Sous', $stmt->fetch()['chemin']);
    }

    public function test_self_reference_rejected(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $t = dal_create_theme($this->pdo, $ctx, ['nom' => 'Self']);
        $r = dal_update_theme($this->pdo, $ctx, $t['data']['id'], ['parent_id' => $t['data']['id']]);
        $this->assertSame('error', $r['status']);
    }

    public function test_create_theme_empty_name_rejected(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_create_theme($this->pdo, $ctx, ['nom' => '  ']);
        $this->assertSame('error', $r['status']);
    }
}
