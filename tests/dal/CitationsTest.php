<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../../api/dal/auteurs.php';
require_once __DIR__ . '/../../api/dal/oeuvres.php';
require_once __DIR__ . '/../../api/dal/themes.php';
require_once __DIR__ . '/../../api/dal/keywords.php';
require_once __DIR__ . '/../../api/dal/citations.php';

final class CitationsTest extends TestCase
{
    private PDO $pdo;
    private int $auteur_id;
    private int $oeuvre_id;
    private int $theme_id;

    protected function setUp(): void
    {
        $this->pdo = get_test_pdo();
        reset_test_db($this->pdo);
        $ctx = create_test_ctx(ROLE_ADMIN);

        $r = dal_create_auteur($this->pdo, $ctx, ['nom' => 'Auteur Test']);
        $this->auteur_id = $r['data']['id'];

        $r = dal_create_oeuvre($this->pdo, $ctx, ['nom' => 'Œuvre Test', 'auteur_id' => $this->auteur_id]);
        $this->oeuvre_id = $r['data']['id'];

        $r = dal_create_theme($this->pdo, $ctx, ['nom' => 'Thème Test']);
        $this->theme_id = $r['data']['id'];
    }

    // --- R1: Default state = À Corriger ---

    public function test_create_citation_forces_etat_a_corriger(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        $r = dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Test contenu',
            'oeuvre_id' => $this->oeuvre_id,
        ]);
        $this->assertSame('ok', $r['status']);

        $stmt = $this->pdo->prepare('SELECT etat_id FROM citations WHERE id = :id');
        $stmt->execute(['id' => $r['data']['id']]);
        $this->assertSame(ETAT_A_CORRIGER, (int) $stmt->fetch()['etat_id']);
    }

    public function test_create_citation_ignores_provided_etat_id(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        $r = dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Test',
            'oeuvre_id' => $this->oeuvre_id,
            'etat_id' => ETAT_PUBLIEE,
        ]);
        $this->assertSame('ok', $r['status']);

        $stmt = $this->pdo->prepare('SELECT etat_id FROM citations WHERE id = :id');
        $stmt->execute(['id' => $r['data']['id']]);
        $this->assertSame(ETAT_A_CORRIGER, (int) $stmt->fetch()['etat_id']);
    }

    // --- R2: Publiée requires full set ---

    public function test_update_to_publiee_without_theme_rejected(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        $r = dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Test',
            'oeuvre_id' => $this->oeuvre_id,
            'date_entree' => '2026-01-01',
        ]);
        $r = dal_update_citation($this->pdo, $ctx, $r['data']['id'], ['etat_id' => ETAT_PUBLIEE]);
        $this->assertSame('error', $r['status']);
        $this->assertStringContainsString('theme', $r['errors'][0]);
    }

    public function test_update_to_publiee_without_keywords_rejected(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        $r = dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Test',
            'oeuvre_id' => $this->oeuvre_id,
            'theme_id' => $this->theme_id,
            'date_entree' => '2026-01-01',
        ]);
        $r = dal_update_citation($this->pdo, $ctx, $r['data']['id'], ['etat_id' => ETAT_PUBLIEE]);
        $this->assertSame('error', $r['status']);
        $this->assertStringContainsString('keywords', $r['errors'][0]);
    }

    public function test_update_to_publiee_with_full_set_succeeds(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        $r = dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Test publication',
            'oeuvre_id' => $this->oeuvre_id,
            'theme_id' => $this->theme_id,
            'date_entree' => '2026-01-01',
        ]);
        $cid = $r['data']['id'];

        $ctx_admin = create_test_ctx(ROLE_ADMIN);
        $kw = dal_create_keyword($this->pdo, $ctx_admin, 'amour');
        dal_set_citation_keywords($this->pdo, $ctx, $cid, [$kw['data']['id']]);

        $r = dal_update_citation($this->pdo, $ctx, $cid, ['etat_id' => ETAT_PUBLIEE]);
        $this->assertSame('ok', $r['status']);

        $stmt = $this->pdo->prepare('SELECT etat_id FROM citations WHERE id = :id');
        $stmt->execute(['id' => $cid]);
        $this->assertSame(ETAT_PUBLIEE, (int) $stmt->fetch()['etat_id']);
    }

    // --- R7: Soft-delete ---

    public function test_find_citations_excludes_soft_deleted(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        $r = dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Visible',
            'oeuvre_id' => $this->oeuvre_id,
        ]);
        $id = $r['data']['id'];
        dal_soft_delete_citation($this->pdo, $ctx, $id);

        $r = dal_find_citations($this->pdo, $ctx);
        $ids = array_column($r['data']['items'], 'id');
        $this->assertNotContains($id, $ids);
    }

    public function test_find_citations_admin_sees_deleted_when_toggled(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        $r = dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Supprimée',
            'oeuvre_id' => $this->oeuvre_id,
        ]);
        $id = $r['data']['id'];
        dal_soft_delete_citation($this->pdo, $ctx, $id);

        $ctx_admin_del = create_test_ctx(ROLE_ADMIN, 1, true);
        $r = dal_find_citations($this->pdo, $ctx_admin_del);
        $ids = array_column($r['data']['items'], 'id');
        $this->assertContains($id, $ids);
    }

    // --- R8: Rights per oeuvre ---

    public function test_find_citations_visiteur_sees_only_publiee(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        // Create one À Corriger
        dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Brouillon',
            'oeuvre_id' => $this->oeuvre_id,
        ]);
        // Create one Publiée (need full set)
        $r = dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Publié',
            'oeuvre_id' => $this->oeuvre_id,
            'theme_id' => $this->theme_id,
            'date_entree' => '2026-01-01',
        ]);
        $pub_id = $r['data']['id'];
        $ctx_admin = create_test_ctx(ROLE_ADMIN);
        $kw = dal_create_keyword($this->pdo, $ctx_admin, 'test_pub');
        dal_set_citation_keywords($this->pdo, $ctx, $pub_id, [$kw['data']['id']]);
        dal_update_citation($this->pdo, $ctx, $pub_id, ['etat_id' => ETAT_PUBLIEE]);

        // Visitor should see only the published one
        $ctx_visiteur = create_test_ctx(ROLE_VISITEUR, null);
        $r = dal_find_citations($this->pdo, $ctx_visiteur);
        $this->assertSame('ok', $r['status']);
        $this->assertCount(1, $r['data']['items']);
        $this->assertSame($pub_id, (int) $r['data']['items'][0]['id']);
    }

    public function test_find_citations_abo3_sees_only_granted_oeuvres(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        // Second oeuvre
        $r = dal_create_oeuvre($this->pdo, $ctx, ['nom' => 'Œuvre 2', 'auteur_id' => $this->auteur_id]);
        $oeuvre2_id = $r['data']['id'];

        // Citation in oeuvre 1 (published)
        $r1 = dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Oeuvre 1',
            'oeuvre_id' => $this->oeuvre_id,
            'theme_id' => $this->theme_id,
            'date_entree' => '2026-01-01',
        ]);
        $ctx_admin = create_test_ctx(ROLE_ADMIN);
        $kw = dal_create_keyword($this->pdo, $ctx_admin, 'abo3test');
        dal_set_citation_keywords($this->pdo, $ctx, $r1['data']['id'], [$kw['data']['id']]);
        dal_update_citation($this->pdo, $ctx, $r1['data']['id'], ['etat_id' => ETAT_PUBLIEE]);

        // Citation in oeuvre 2 (published)
        $r2 = dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Oeuvre 2',
            'oeuvre_id' => $oeuvre2_id,
            'theme_id' => $this->theme_id,
            'date_entree' => '2026-01-01',
        ]);
        $kw2 = dal_create_keyword($this->pdo, $ctx_admin, 'abo3test2');
        dal_set_citation_keywords($this->pdo, $ctx, $r2['data']['id'], [$kw2['data']['id']]);
        dal_update_citation($this->pdo, $ctx, $r2['data']['id'], ['etat_id' => ETAT_PUBLIEE]);

        // Grant Abo3 access to oeuvre 1 only
        $this->pdo->prepare('INSERT INTO role_oeuvre_access (role_id, oeuvre_id) VALUES (:rid, :oid)')
            ->execute(['rid' => ROLE_ABO3, 'oid' => $this->oeuvre_id]);

        // Abo3 should see only oeuvre 1
        $ctx_abo3 = create_test_ctx(ROLE_ABO3, 10);
        $r = dal_find_citations($this->pdo, $ctx_abo3);
        $this->assertSame('ok', $r['status']);
        $this->assertCount(1, $r['data']['items']);
        $this->assertSame((int) $r1['data']['id'], (int) $r['data']['items'][0]['id']);
    }

    public function test_find_citations_editeur_sees_all(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Brouillon éditeur',
            'oeuvre_id' => $this->oeuvre_id,
        ]);
        $r = dal_find_citations($this->pdo, $ctx);
        $this->assertSame('ok', $r['status']);
        $this->assertGreaterThanOrEqual(1, count($r['data']['items']));
    }

    // --- R9: Keyset pagination ---

    public function test_find_citations_keyset_pagination(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        for ($i = 1; $i <= 60; $i++) {
            dal_create_citation($this->pdo, $ctx, [
                'contenu' => "Citation {$i}",
                'oeuvre_id' => $this->oeuvre_id,
                'date_entree' => sprintf('2026-01-%02d', min($i, 28)),
            ]);
        }

        // Page 1: 50 items + cursor
        $r = dal_find_citations($this->pdo, $ctx, [], null, 50);
        $this->assertSame('ok', $r['status']);
        $this->assertCount(50, $r['data']['items']);
        $this->assertNotNull($r['data']['next_cursor']);

        // Page 2: remaining 10
        $r2 = dal_find_citations($this->pdo, $ctx, [], $r['data']['next_cursor'], 50);
        $this->assertSame('ok', $r2['status']);
        $this->assertCount(10, $r2['data']['items']);
        $this->assertNull($r2['data']['next_cursor']);

        // No overlap between pages
        $ids1 = array_column($r['data']['items'], 'id');
        $ids2 = array_column($r2['data']['items'], 'id');
        $this->assertEmpty(array_intersect($ids1, $ids2));
    }

    // --- R10: Concurrent edit lock ---

    public function test_update_citation_concurrent_lock(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        $r = dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Lock test',
            'oeuvre_id' => $this->oeuvre_id,
        ]);
        $cid = $r['data']['id'];

        // Open a second connection and lock the row
        $pdo2 = dal_get_pdo([
            'db_host' => '127.0.0.1',
            'db_name' => 'lumosphere_test',
            'db_user' => 'lumo_test',
            'db_pass' => 'lumo_test_pwd',
        ]);
        $pdo2->beginTransaction();
        $pdo2->exec('SET innodb_lock_wait_timeout = 5');
        $pdo2->prepare('SELECT id FROM citations WHERE id = :id FOR UPDATE')
             ->execute(['id' => $cid]);

        // Try to update on the first connection — should timeout
        $r = dal_update_citation($this->pdo, $ctx, $cid, ['contenu' => 'Modified']);
        $this->assertSame('error', $r['status']);
        $this->assertStringContainsString('en cours d\'édition', $r['errors'][0]);

        $pdo2->rollBack();
    }

    // --- Other ---

    public function test_auteur_nom_denormalized_on_create(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        $r = dal_create_citation($this->pdo, $ctx, [
            'contenu' => 'Dénormalisé',
            'oeuvre_id' => $this->oeuvre_id,
        ]);
        $stmt = $this->pdo->prepare('SELECT auteur_nom FROM citations WHERE id = :id');
        $stmt->execute(['id' => $r['data']['id']]);
        $this->assertSame('Auteur Test', $stmt->fetch()['auteur_nom']);
    }

    public function test_soft_delete_and_restore(): void
    {
        $ctx_edit = create_test_ctx(ROLE_EDITEUR);
        $r = dal_create_citation($this->pdo, $ctx_edit, [
            'contenu' => 'A restaurer',
            'oeuvre_id' => $this->oeuvre_id,
        ]);
        $id = $r['data']['id'];

        dal_soft_delete_citation($this->pdo, $ctx_edit, $id);

        // Éditeur cannot restore
        $r = dal_restore_citation($this->pdo, $ctx_edit, $id);
        $this->assertSame('error', $r['status']);

        // Admin can restore
        $ctx_admin = create_test_ctx(ROLE_ADMIN);
        $r = dal_restore_citation($this->pdo, $ctx_admin, $id);
        $this->assertSame('ok', $r['status']);
    }

    public function test_create_citation_empty_content_rejected(): void
    {
        $ctx = create_test_ctx(ROLE_EDITEUR);
        $r = dal_create_citation($this->pdo, $ctx, [
            'contenu' => '',
            'oeuvre_id' => $this->oeuvre_id,
        ]);
        $this->assertSame('error', $r['status']);
    }
}
