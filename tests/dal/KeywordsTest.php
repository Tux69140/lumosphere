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

    /**
     * R6 (révisé) — casse préservée ; accents retirés des MAJUSCULES uniquement
     * (en français, les majuscules ne portent pas d'accent). Les minuscules
     * accentuées sont conservées. L'unicité reste gérée par la collation.
     */
    public function test_create_keyword_preserves_case_strips_uppercase_accents(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        $cases = [
            'Amour'     => 'Amour',     // casse conservée
            'Nécessité' => 'Nécessité', // minuscules accentuées conservées
            'Évolution' => 'Evolution', // É majuscule → E sans accent
            'ÉTAT'      => 'ETAT',      // tout en majuscules
            'À la fois' => 'A la fois', // À → A
        ];
        foreach ($cases as $input => $expected) {
            $this->pdo->exec('DELETE FROM keywords');
            $r = dal_create_keyword($this->pdo, $ctx, $input);
            $this->assertSame('ok', $r['status'], "création de « $input »");
            $stmt = $this->pdo->prepare('SELECT mot FROM keywords WHERE id = :id');
            $stmt->execute(['id' => $r['data']['id']]);
            $this->assertSame($expected, $stmt->fetch()['mot'], "« $input » → « $expected »");
        }
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

    /**
     * Cas du bug : mot-clé stocké en minuscules (ancienne normalisation),
     * find_or_create avec une casse différente doit mettre à jour le mot en base.
     */
    public function test_find_or_create_upgrades_lowercase_casing(): void
    {
        $ctx = create_test_ctx(ROLE_ADMIN);
        // Simuler un mot-clé pré-existant en minuscules (ancienne normalisation).
        $this->pdo->exec("INSERT INTO keywords (mot) VALUES ('nécessité')");
        $oldId = (int) $this->pdo->lastInsertId();

        // L'utilisateur accepte la suggestion "Nécessité" → find_or_create doit
        // retrouver le même ID et mettre à jour la casse en base.
        $r = dal_find_or_create_keyword($this->pdo, $ctx, 'Nécessité');
        $this->assertSame('ok', $r['status']);
        $this->assertSame($oldId, $r['data']['id']);
        $this->assertSame('Nécessité', $r['data']['mot']);

        // La base doit refléter la nouvelle casse.
        $stmt = $this->pdo->prepare('SELECT mot FROM keywords WHERE id = :id');
        $stmt->execute(['id' => $oldId]);
        $this->assertSame('Nécessité', $stmt->fetch()['mot']);
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
