<?php

declare(strict_types=1);

namespace Tests\Dal;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../api/dal/core.php';
require_once __DIR__ . '/../../api/dal/password_tokens.php';
require_once __DIR__ . '/TestHelper.php';

class PasswordTokensTest extends TestCase
{
    private \PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = TestHelper::getTestPdo();
        $this->pdo->beginTransaction();
        // Créer un utilisateur de test
        $this->pdo->exec(
            "INSERT INTO users (id, prenom, nom, email, password_hash, role_id)
             VALUES (999, 'Test', 'User', 'token_test@example.com', '!', 3)"
        );
    }

    protected function tearDown(): void { $this->pdo->rollBack(); }

    public function testCreateTokenReturns64HexChars(): void
    {
        $raw = dal_token_create($this->pdo, 999, 'invite', 604800, '127.0.0.1');
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $raw);
    }

    public function testCreateTokenStoredAsHash(): void
    {
        $raw = dal_token_create($this->pdo, 999, 'invite', 604800, '127.0.0.1');
        $hash = hash('sha256', $raw);
        $row = $this->pdo->query("SELECT token_hash FROM password_tokens WHERE user_id = 999")->fetch();
        $this->assertSame($hash, $row['token_hash']);
    }

    public function testFindValidTokenReturnsRow(): void
    {
        $raw = dal_token_create($this->pdo, 999, 'invite', 604800, '127.0.0.1');
        $found = dal_token_find_valid($this->pdo, $raw);
        $this->assertNotNull($found);
        $this->assertSame(999, (int) $found['user_id']);
        $this->assertSame('invite', $found['type']);
    }

    public function testFindValidTokenReturnNullIfExpired(): void
    {
        $raw = dal_token_create($this->pdo, 999, 'reset', 1, '127.0.0.1');
        // Forcer l'expiration
        $this->pdo->exec("UPDATE password_tokens SET expires_at = DATE_SUB(NOW(), INTERVAL 1 SECOND) WHERE user_id = 999");
        $this->assertNull(dal_token_find_valid($this->pdo, $raw));
    }

    public function testConsumedTokenIsInvalid(): void
    {
        $raw = dal_token_create($this->pdo, 999, 'invite', 604800, '127.0.0.1');
        $found = dal_token_find_valid($this->pdo, $raw);
        dal_token_consume($this->pdo, (int) $found['id']);
        $this->assertNull(dal_token_find_valid($this->pdo, $raw));
    }

    public function testRevokeRemovesExistingTokens(): void
    {
        dal_token_create($this->pdo, 999, 'invite', 604800, '127.0.0.1');
        dal_token_create($this->pdo, 999, 'invite', 604800, '127.0.0.1');
        dal_token_revoke_user_tokens($this->pdo, 999, 'invite');
        $count = $this->pdo->query("SELECT COUNT(*) FROM password_tokens WHERE user_id = 999 AND used_at IS NULL")->fetchColumn();
        $this->assertSame(0, (int) $count);
    }
}
