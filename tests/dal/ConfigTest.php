<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../../api/dal/config.php';

final class ConfigTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = get_test_pdo();
        $this->pdo->exec('DELETE FROM config');
    }

    public function test_config_value_returns_default_when_absent(): void
    {
        $this->assertSame('fallback', dal_config_value($this->pdo, 'inexistant', 'fallback'));
        $this->assertNull(dal_config_value($this->pdo, 'inexistant'));
    }

    public function test_set_then_get_config(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_set_config($this->pdo, $ctx, 'ma_cle', 'ma_valeur');
        $this->assertSame('ok', $r['status']);
        $this->assertSame('ma_valeur', dal_config_value($this->pdo, 'ma_cle'));
    }

    public function test_set_config_upserts(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        dal_set_config($this->pdo, $ctx, 'ma_cle', 'v1');
        dal_set_config($this->pdo, $ctx, 'ma_cle', 'v2');
        $this->assertSame('v2', dal_config_value($this->pdo, 'ma_cle'));
        $cnt = (int) $this->pdo->query("SELECT COUNT(*) AS c FROM config WHERE cle='ma_cle'")->fetch()['c'];
        $this->assertSame(1, $cnt);
    }

    public function test_set_config_requires_admin_settings(): void
    {
        $ctx = create_test_ctx(ROLE_VISITEUR, null);
        $this->expectException(\RuntimeException::class);
        dal_set_config($this->pdo, $ctx, 'ma_cle', 'x');
    }

    public function test_get_config_admin_returns_value(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        dal_set_config($this->pdo, $ctx, 'ma_cle', 'ma_valeur');
        $r = dal_get_config($this->pdo, $ctx, 'ma_cle');
        $this->assertSame('ok', $r['status']);
        $this->assertSame('ma_valeur', $r['data']);
    }

    public function test_get_config_requires_admin_settings(): void
    {
        $ctx = create_test_ctx(ROLE_VISITEUR, null);
        $this->expectException(\RuntimeException::class);
        dal_get_config($this->pdo, $ctx, 'ma_cle');
    }

    public function test_debug_mode_off_by_default(): void
    {
        $this->assertFalse(dal_is_debug_mode($this->pdo));
    }

    public function test_debug_mode_on_when_set_to_1(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        dal_set_config($this->pdo, $ctx, 'mode_debug_global', '1');
        $this->assertTrue(dal_is_debug_mode($this->pdo));
    }

    public function test_debug_mode_off_when_set_to_0(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        dal_set_config($this->pdo, $ctx, 'mode_debug_global', '0');
        $this->assertFalse(dal_is_debug_mode($this->pdo));
    }
}
