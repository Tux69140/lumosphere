<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../../api/dal/auteurs.php';
require_once __DIR__ . '/../../api/dal/oeuvres.php';

final class OeuvresTest extends TestCase
{
    private PDO $pdo;
    private int $auteur_id;
    private int $auteur2_id;

    protected function setUp(): void
    {
        $this->pdo = get_test_pdo();
        reset_test_db($this->pdo);
        $ctx = create_test_ctx(ROLE_ADMIN);

        $this->auteur_id  = dal_create_auteur($this->pdo, $ctx, ['nom' => 'Auteur A'])['data']['id'];
        $this->auteur2_id = dal_create_auteur($this->pdo, $ctx, ['nom' => 'Auteur B'])['data']['id'];
    }

    public function test_create_oeuvre_rejects_duplicate_same_author_and_name(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $first = dal_create_oeuvre($this->pdo, $ctx, ['nom' => 'Telegram', 'auteur_id' => $this->auteur_id]);
        $this->assertSame('ok', $first['status']);

        $dup = dal_create_oeuvre($this->pdo, $ctx, ['nom' => 'Telegram', 'auteur_id' => $this->auteur_id]);
        $this->assertSame('error', $dup['status']);

        $count = $this->pdo->query("SELECT COUNT(*) FROM oeuvres WHERE nom = 'Telegram'")->fetchColumn();
        $this->assertSame(1, (int) $count);
    }

    public function test_create_oeuvre_allows_same_name_for_different_author(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $a = dal_create_oeuvre($this->pdo, $ctx, ['nom' => 'Telegram', 'auteur_id' => $this->auteur_id]);
        $b = dal_create_oeuvre($this->pdo, $ctx, ['nom' => 'Telegram', 'auteur_id' => $this->auteur2_id]);
        $this->assertSame('ok', $a['status']);
        $this->assertSame('ok', $b['status']);
    }

    public function test_update_oeuvre_rejects_rename_into_existing_pair(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        dal_create_oeuvre($this->pdo, $ctx, ['nom' => 'Telegram', 'auteur_id' => $this->auteur_id]);
        $other = dal_create_oeuvre($this->pdo, $ctx, ['nom' => 'ebook', 'auteur_id' => $this->auteur_id]);

        // Renommer « ebook » en « Telegram » (même auteur) doit être refusé.
        $r = dal_update_oeuvre($this->pdo, $ctx, $other['data']['id'], ['nom' => 'Telegram']);
        $this->assertSame('error', $r['status']);
    }
}
