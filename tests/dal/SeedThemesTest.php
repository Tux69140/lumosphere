<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../../api/dal/themes.php';

final class SeedThemesTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = get_test_pdo();
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        $this->pdo->exec('DELETE FROM citations');
        $this->pdo->exec('DELETE FROM themes');
        $this->pdo->exec('ALTER TABLE themes AUTO_INCREMENT = 1');
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

        $this->_load_seed(__DIR__ . '/../../db/migrations/006_themes_seed.sql');
    }

    private function _load_seed(string $path): void
    {
        $sql = file_get_contents($path);
        // Strip single-line comments before splitting — évite que les blocs
        // "-- commentaire\nINSERT ..." soient filtrés à cause du commentaire initial
        $sql = preg_replace('/^\s*--.*$/m', '', $sql);
        foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) {
            if ($stmt !== '') {
                $this->pdo->exec($stmt);
            }
        }
    }

    public function test_seed_loads_16_themes(): void
    {
        $cnt = (int) $this->pdo->query('SELECT COUNT(*) AS cnt FROM themes')->fetch()['cnt'];
        $this->assertSame(16, $cnt);
    }

    public function test_seed_loads_4_root_themes(): void
    {
        $cnt = (int) $this->pdo->query('SELECT COUNT(*) AS cnt FROM themes WHERE parent_id IS NULL')->fetch()['cnt'];
        $this->assertSame(4, $cnt);
    }

    public function test_seed_loads_12_subthemes(): void
    {
        $cnt = (int) $this->pdo->query('SELECT COUNT(*) AS cnt FROM themes WHERE parent_id IS NOT NULL')->fetch()['cnt'];
        $this->assertSame(12, $cnt);
    }

    public function test_each_root_theme_has_exactly_3_children(): void
    {
        $rows = $this->pdo->query(
            'SELECT parent_id, COUNT(*) AS cnt FROM themes WHERE parent_id IS NOT NULL GROUP BY parent_id'
        )->fetchAll();
        $this->assertCount(4, $rows);
        foreach ($rows as $row) {
            $this->assertSame(3, (int) $row['cnt'], "parent_id={$row['parent_id']} devrait avoir 3 enfants");
        }
    }

    public function test_all_chemins_are_set(): void
    {
        $cnt = (int) $this->pdo->query("SELECT COUNT(*) AS cnt FROM themes WHERE chemin IS NULL OR chemin = ''")->fetch()['cnt'];
        $this->assertSame(0, $cnt);
    }

    public function test_subthemes_chemin_contains_slash(): void
    {
        $cnt = (int) $this->pdo->query("SELECT COUNT(*) AS cnt FROM themes WHERE parent_id IS NOT NULL AND chemin NOT LIKE '%/%'")->fetch()['cnt'];
        $this->assertSame(0, $cnt);
    }

    public function test_no_depth_3(): void
    {
        $cnt = (int) $this->pdo->query(
            'SELECT COUNT(*) AS cnt FROM themes WHERE parent_id IN (SELECT id FROM themes WHERE parent_id IS NOT NULL)'
        )->fetch()['cnt'];
        $this->assertSame(0, $cnt);
    }

    public function test_theme_1_correct(): void
    {
        $stmt = $this->pdo->prepare('SELECT * FROM themes WHERE id = 1');
        $stmt->execute();
        $row = $stmt->fetch();
        $this->assertSame('Chemin et relation à Dieu', $row['nom']);
        $this->assertNull($row['parent_id']);
        $this->assertSame('Chemin et relation à Dieu', $row['chemin']);
        $this->assertNotEmpty($row['description']);
    }

    public function test_theme_6_foi_et_priere(): void
    {
        $stmt = $this->pdo->prepare('SELECT * FROM themes WHERE id = 6');
        $stmt->execute();
        $row = $stmt->fetch();
        $this->assertSame('Foi et prière', $row['nom']);
        $this->assertSame(1, (int) $row['parent_id']);
        $this->assertSame('Chemin et relation à Dieu/Foi et prière', $row['chemin']);
    }

    public function test_seed_is_idempotent(): void
    {
        $this->_load_seed(__DIR__ . '/../../db/migrations/006_themes_seed.sql');
        $cnt = (int) $this->pdo->query('SELECT COUNT(*) AS cnt FROM themes')->fetch()['cnt'];
        $this->assertSame(16, $cnt);
    }

    public function test_dal_find_themes_returns_seeded_data(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_find_themes($this->pdo, $ctx);
        $this->assertSame('ok', $r['status']);
        $this->assertCount(16, $r['data']);
        $chemins = array_column($r['data'], 'chemin');
        $this->assertLessThan(
            array_search('Connaissance et vision du monde', $chemins),
            array_search('Chemin et relation à Dieu', $chemins)
        );
    }
}
