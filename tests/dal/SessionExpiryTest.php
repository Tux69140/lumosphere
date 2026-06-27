<?php

declare(strict_types=1);

namespace Tests\Dal;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../api/dal/auth.php';

class SessionExpiryTest extends TestCase
{
    public function testNonRememberAliveWithinIdle(): void
    {
        $now = 1_000_000;
        $s = ['remember' => false, 'last_activity' => $now - 3600, 'login_at' => $now - 3600];
        $this->assertFalse(dal_auth_is_session_expired($s, $now));
    }

    public function testNonRememberExpiresAfterIdle(): void
    {
        $now = 1_000_000;
        $s = ['remember' => false, 'last_activity' => $now - (3 * 3600), 'login_at' => $now - (3 * 3600)];
        $this->assertTrue(dal_auth_is_session_expired($s, $now));
    }

    public function testRememberSurvivesLongIdle(): void
    {
        $now = 1_000_000;
        $s = ['remember' => true, 'last_activity' => $now - (10 * 3600), 'login_at' => $now - (10 * 3600)];
        $this->assertFalse(dal_auth_is_session_expired($s, $now));
    }

    public function testRememberExpiresAfter30Days(): void
    {
        $login = 1_000_000;
        $now = $login + (31 * 24 * 3600);
        $s = ['remember' => true, 'last_activity' => $now, 'login_at' => $login];
        $this->assertTrue(dal_auth_is_session_expired($s, $now));
    }
}
