<?php

declare(strict_types=1);

namespace Tests\Dal;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../api/dal/auth.php';
require_once __DIR__ . '/../../api/dal/config.php';
require_once __DIR__ . '/TestHelper.php';

class AuthTest extends TestCase
{
    private \PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = TestHelper::getTestPdo();
        $this->pdo->beginTransaction();
    }

    protected function tearDown(): void
    {
        $this->pdo->rollBack();
    }

    public function testRateLimitNotLockedInitially(): void
    {
        $result = dal_auth_check_rate_limit($this->pdo, 'test@example.com');
        $this->assertFalse($result['locked']);
        $this->assertSame(0, $result['remaining_seconds']);
    }

    public function testRateLimitLocksAfterMaxAttempts(): void
    {
        $email = 'brute@example.com';
        for ($i = 0; $i < MAX_LOGIN_ATTEMPTS; $i++) {
            dal_auth_record_failed_attempt($this->pdo, $email);
        }
        $result = dal_auth_check_rate_limit($this->pdo, $email);
        $this->assertTrue($result['locked']);
        $this->assertGreaterThan(0, $result['remaining_seconds']);
    }

    public function testClearAttemptsResetsCounter(): void
    {
        $email = 'clear@example.com';
        for ($i = 0; $i < 3; $i++) {
            dal_auth_record_failed_attempt($this->pdo, $email);
        }
        dal_auth_clear_attempts($this->pdo, $email);
        $result = dal_auth_check_rate_limit($this->pdo, $email);
        $this->assertFalse($result['locked']);
    }

    public function testLoadPermissionsReturnsCodeArray(): void
    {
        $perms = dal_auth_load_permissions($this->pdo, ROLE_ADMIN);
        $this->assertIsArray($perms);
        $this->assertContains('corpus.read', $perms);
        $this->assertContains('admin.users', $perms);
    }

    public function testLoadPermissionsVisiteurMinimal(): void
    {
        $perms = dal_auth_load_permissions($this->pdo, ROLE_VISITEUR);
        $this->assertSame(['corpus.read'], $perms);
    }

    public function testHasAnyUserReturnsFalseOnEmptyTable(): void
    {
        $this->pdo->exec('DELETE FROM users');
        $this->assertFalse(dal_auth_has_any_user($this->pdo));
    }

    public function testSetupSecretVerification(): void
    {
        $this->pdo->prepare(
            "INSERT INTO config (cle, valeur) VALUES ('setup_secret', 'mysecret123')
             ON DUPLICATE KEY UPDATE valeur = 'mysecret123'"
        )->execute();

        $this->assertTrue(dal_auth_verify_setup_secret($this->pdo, 'mysecret123'));
        $this->assertFalse(dal_auth_verify_setup_secret($this->pdo, 'wrongsecret'));
    }

    public function testDeleteSetupSecret(): void
    {
        $this->pdo->prepare(
            "INSERT INTO config (cle, valeur) VALUES ('setup_secret', 'todelete')
             ON DUPLICATE KEY UPDATE valeur = 'todelete'"
        )->execute();

        dal_auth_delete_setup_secret($this->pdo);
        $this->assertFalse(dal_auth_verify_setup_secret($this->pdo, 'todelete'));
    }

    public function testCreateFirstAdminRequiresEmail(): void
    {
        $result = dal_auth_create_first_admin($this->pdo, [
            'prenom' => 'Test',
            'nom' => 'Admin',
            'email' => '',
            'password' => 'password123',
        ]);
        $this->assertSame('error', $result['status']);
    }

    public function testCreateFirstAdminRequiresLongPassword(): void
    {
        $result = dal_auth_create_first_admin($this->pdo, [
            'prenom' => 'Test',
            'nom' => 'Admin',
            'email' => 'admin@test.com',
            'password' => 'short',
        ]);
        $this->assertSame('error', $result['status']);
    }

    public function testSessionRevocationCheck(): void
    {
        $hash = hash('sha256', 'test-session-id');
        $this->assertFalse(dal_auth_is_session_revoked($this->pdo, $hash));
    }
}
