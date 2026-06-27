<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../../api/dal/keywords.php';

final class KeywordsTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = get_test_pdo();
        $this->pdo->exec('DELETE FROM citation_keywords');
        $this->pdo->exec('DELETE FROM keywords');
    }

    /** R6 — normalize to lowercase */
    public function test_create_keyword_normalizes_to_lowercase(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_create_keyword($this->pdo, $ctx, 'Amour');
        $this->assertSame('ok', $r['status']);

        $stmt = $this->pdo->prepare('SELECT mot FROM keywords WHERE id = :id');
        $stmt->execute(['id' => $r['data']['id']]);
        $this->assertSame('amour', $stmt->fetch()['mot']);
    }

    /** R6 — trim whitespace */
    public function test_create_keyword_trims_whitespace(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_create_keyword($this->pdo, $ctx, '  lumière  ');
        $this->assertSame('ok', $r['status']);

        $stmt = $this->pdo->prepare('SELECT mot FROM keywords WHERE id = :id');
        $stmt->execute(['id' => $r['data']['id']]);
        $this->assertSame('lumière', $stmt->fetch()['mot']);
    }

    public function test_create_keyword_empty_rejected(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_create_keyword($this->pdo, $ctx, '   ');
        $this->assertSame('error', $r['status']);
    }

    /** R6 — duplicate detected via collation */
    public function test_create_keyword_duplicate_detected(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        dal_create_keyword($this->pdo, $ctx, 'paix');
        $r = dal_create_keyword($this->pdo, $ctx, 'Paix');
        $this->assertSame('error', $r['status']);
        $this->assertStringContainsString('existe déjà', $r['errors'][0]);
    }

    public function test_find_or_create_returns_existing(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r1 = dal_find_or_create_keyword($this->pdo, $ctx, 'conscience');
        $r2 = dal_find_or_create_keyword($this->pdo, $ctx, 'Conscience');
        $this->assertSame('ok', $r1['status']);
        $this->assertSame('ok', $r2['status']);
        $this->assertSame($r1['data']['id'], $r2['data']['id']);
    }

    public function test_find_keywords_with_search_prefix(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        dal_create_keyword($this->pdo, $ctx, 'méditation');
        dal_create_keyword($this->pdo, $ctx, 'mémoire');
        dal_create_keyword($this->pdo, $ctx, 'amour');

        $r = dal_find_keywords($this->pdo, $ctx, 'mé');
        $this->assertSame('ok', $r['status']);
        $this->assertCount(2, $r['data']);
    }

    public function test_delete_keyword(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_create_keyword($this->pdo, $ctx, 'éphémère');
        $id = $r['data']['id'];
        $r = dal_delete_keyword($this->pdo, $ctx, $id);
        $this->assertSame('ok', $r['status']);
        $r = dal_delete_keyword($this->pdo, $ctx, $id);
        $this->assertSame('error', $r['status']);
    }
}
