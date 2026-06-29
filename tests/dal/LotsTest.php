<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/../../api/dal/auteurs.php';
require_once __DIR__ . '/../../api/dal/oeuvres.php';
require_once __DIR__ . '/../../api/dal/themes.php';
require_once __DIR__ . '/../../api/dal/lots.php';

/**
 * Régression : dal_integrate_lot doit RÉELLEMENT bloquer un lot non conforme.
 * Avant le correctif, la conformité (status='ok', conforme=false) était ignorée
 * et l'intégration s'effectuait quand même.
 */
final class LotsTest extends TestCase
{
    private PDO $pdo;
    private array $ctx;
    private int $auteur_id;
    private int $oeuvre_id;
    private int $theme_id;

    protected function setUp(): void
    {
        $this->pdo = get_test_pdo();
        reset_test_db($this->pdo);
        $this->ctx = create_test_ctx(ROLE_ADMIN);

        $this->auteur_id = dal_create_auteur($this->pdo, $this->ctx, ['nom' => 'Auteur Lot'])['data']['id'];
        $this->oeuvre_id = dal_create_oeuvre(
            $this->pdo,
            $this->ctx,
            ['nom' => 'Œuvre Lot', 'auteur_id' => $this->auteur_id]
        )['data']['id'];
        $this->theme_id = dal_create_theme($this->pdo, $this->ctx, ['nom' => 'Thème Lot'])['data']['id'];
    }

    private function makeLot(string $status): array
    {
        $lotKey = 'test_integrate_001';
        $this->pdo->prepare(
            "INSERT INTO lots (lot_id, source_type, titre_lot, status, date_source_debut, date_source_fin, debug_mode)
             VALUES (?, 'telegram', 'Lot de test', ?, '2026-06-29', '2026-06-29', 1)"
        )->execute([$lotKey, $status]);
        return [(int) $this->pdo->lastInsertId(), $lotKey];
    }

    private function makeDoc(string $lotKey, ?int $theme_id): int
    {
        $this->pdo->prepare(
            "INSERT INTO documents
                (lot_id, titre, type_document, status, source_item_id, contenu_brut, hash_contenu,
                 selected, theme_id, oeuvre_id, date_publication)
             VALUES (?, 'Doc test', 'telegram', 'en_revision', '900', 'Contenu de test', ?, 1, ?, ?, '2026-06-29')"
        )->execute([$lotKey, hash('sha256', 'Contenu de test'), $theme_id, $this->oeuvre_id]);
        return (int) $this->pdo->lastInsertId();
    }

    public function test_integrate_blocks_non_conforme_lot(): void
    {
        // Le chemin non conforme retourne AVANT toute transaction DAL :
        // on peut donc encapsuler dans une transaction et tout annuler ensuite.
        $this->pdo->beginTransaction();
        try {
            // Statut « pret » volontaire : l'ancien code passait le garde de statut et
            // intégrait malgré la non-conformité. Le correctif doit bloquer ici.
            [$lotId, $lotKey] = $this->makeLot('pret');
            $this->makeDoc($lotKey, null); // thème manquant → non conforme

            $res = dal_integrate_lot($this->pdo, $this->ctx, $lotId);

            $this->assertSame('error', $res['status'], 'Un lot non conforme ne doit pas être intégré.');
            // Le message remonte le détail des manques.
            $this->assertNotEmpty($res['errors']);

            // Statut du lot inchangé : rien n'a été intégré.
            $status = $this->pdo->query("SELECT status FROM lots WHERE id = {$lotId}")->fetchColumn();
            $this->assertSame('pret', $status);

            // Aucune citation écrite.
            $count = (int) $this->pdo->query('SELECT COUNT(*) FROM citations')->fetchColumn();
            $this->assertSame(0, $count);
        } finally {
            $this->pdo->rollBack();
        }
    }

    public function test_conformity_reports_missing_theme(): void
    {
        $this->pdo->beginTransaction();
        try {
            [$lotId, $lotKey] = $this->makeLot('en_revision');
            $this->makeDoc($lotKey, null);

            $res = dal_check_lot_conformity($this->pdo, $this->ctx, $lotId);
            $this->assertSame('ok', $res['status']);
            $this->assertFalse($res['data']['conforme']);
            $this->assertSame(0, $res['data']['documents_ok']);
            $this->assertSame(1, $res['data']['documents_total']);
        } finally {
            $this->pdo->rollBack();
        }
    }
}
