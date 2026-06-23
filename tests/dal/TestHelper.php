<?php

declare(strict_types=1);

namespace Tests\Dal;

require_once __DIR__ . '/bootstrap.php';

/**
 * Shared test utilities — wraps bootstrap helpers for PHPUnit test classes.
 */
class TestHelper
{
    public static function getTestPdo(): \PDO
    {
        return get_test_pdo();
    }

    public static function ctxAdmin(): array
    {
        return create_test_ctx(ROLE_ADMIN, 1);
    }

    public static function ctxEditeur(): array
    {
        return create_test_ctx(ROLE_EDITEUR, 2);
    }

    public static function ctxVisiteur(): array
    {
        return create_test_ctx(ROLE_VISITEUR, null);
    }

    public static function ctxAbo3(int $userId = 10): array
    {
        return create_test_ctx(ROLE_ABO3, $userId);
    }
}
