<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../../api/dal/citations.php';

/**
 * Fulltext search tests: response format, empty query fallback, keyword OR/AND modes.
 */
final class SearchTest extends TestCase
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

    public function test_search_returns_standard_format(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR, 2);
        $result = dal_search_citations($this->pdo, $ctx, 'test');
        $this->assertSame('ok', $result['status']);
        $this->assertArrayHasKey('items', $result['data']);
        $this->assertArrayHasKey('next_cursor', $result['data']);
    }

    public function test_empty_search_falls_back_to_find(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR, 2);
        $result = dal_search_citations($this->pdo, $ctx, '');
        $this->assertSame('ok', $result['status']);
        $this->assertArrayHasKey('items', $result['data']);
    }

    public function test_keyword_filter_or_mode(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR, 2);
        $result = dal_find_citations($this->pdo, $ctx, [
            'keyword_ids'  => [1, 2],
            'keyword_mode' => 'or',
        ]);
        $this->assertSame('ok', $result['status']);
    }

    public function test_keyword_filter_and_mode(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR, 2);
        $result = dal_find_citations($this->pdo, $ctx, [
            'keyword_ids'  => [1, 2],
            'keyword_mode' => 'and',
        ]);
        $this->assertSame('ok', $result['status']);
    }
}
