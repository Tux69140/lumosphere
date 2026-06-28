<?php

declare(strict_types=1);

namespace Tests\Dal;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../api/dal/collecte.php';
require_once __DIR__ . '/TestHelper.php';

class CollecteTest extends TestCase
{
    public function testTopupRefusedWithoutPermission(): void
    {
        $pdo = TestHelper::getTestPdo();
        $ctx = ['user_id' => 9, 'permissions' => ['corpus.read']]; // pas atelier.lots
        $this->expectException(\RuntimeException::class);
        dal_collecte_topup($pdo, $ctx, 0);
    }
}
