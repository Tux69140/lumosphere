<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../../api/dal/roles.php';
require_once __DIR__ . '/../../api/dal/oeuvres.php';
require_once __DIR__ . '/../../api/dal/auteurs.php';

final class RoleOeuvreAccessTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = get_test_pdo();
        reset_test_db($this->pdo);
    }

    public function test_get_returns_empty_then_set_replaces(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $a = dal_create_auteur($this->pdo, $ctx, ['nom' => 'A'])['data']['id'];
        $o1 = dal_create_oeuvre($this->pdo, $ctx, ['nom' => 'O1', 'auteur_id' => $a])['data']['id'];
        $o2 = dal_create_oeuvre($this->pdo, $ctx, ['nom' => 'O2', 'auteur_id' => $a])['data']['id'];

        $this->assertSame([], dal_get_role_oeuvre_access($this->pdo, $ctx, ROLE_ABO3)['data']['oeuvre_ids']);

        dal_set_role_oeuvre_access($this->pdo, $ctx, ROLE_ABO3, [$o1, $o2]);
        $this->assertEqualsCanonicalizing([$o1, $o2], dal_get_role_oeuvre_access($this->pdo, $ctx, ROLE_ABO3)['data']['oeuvre_ids']);

        dal_set_role_oeuvre_access($this->pdo, $ctx, ROLE_ABO3, [$o1]);
        $this->assertSame([$o1], dal_get_role_oeuvre_access($this->pdo, $ctx, ROLE_ABO3)['data']['oeuvre_ids']);
    }

    public function test_set_rejects_non_subscriber_role(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $r = dal_set_role_oeuvre_access($this->pdo, $ctx, ROLE_EDITEUR, [1]);
        $this->assertSame('error', $r['status']);
    }

    public function test_set_requires_admin_roles_permission(): void
    {
        $this->expectException(RuntimeException::class);
        $ctx = create_test_ctx(ROLE_ABO3, 10); // n'a pas admin.roles
        dal_set_role_oeuvre_access($this->pdo, $ctx, ROLE_ABO3, [1]);
    }
}
