<?php
declare(strict_types=1);
namespace Tests\Dal;

use PHPUnit\Framework\TestCase;
require_once __DIR__ . '/../../cron/lib/ai_enrichment.php';
require_once __DIR__ . '/../../api/dal/lots.php';
require_once __DIR__ . '/TestHelper.php';

class AiEnrichmentTest extends TestCase
{
    /** Insère un thème + un document, renvoie [themeId, docId]. */
    private function seedThemeAndDoc(\PDO $pdo): array
    {
        $pdo->prepare("INSERT INTO themes (nom, parent_id) VALUES ('Foi', NULL)")->execute();
        $themeId = (int) $pdo->lastInsertId();
        $pdo->prepare(
            "INSERT INTO documents (lot_id, titre, type_document, status, contenu_brut, selected)
             VALUES ('lot_test_ai', 'doc', 'telegram', 'en_revision', 'un texte', 1)"
        )->execute();
        $docId = (int) $pdo->lastInsertId();
        return [$themeId, $docId];
    }

    public function testStoreSuggestionsSetsSuggestedThemeNotValidated(): void
    {
        $pdo = \Tests\Dal\TestHelper::getTestPdo();
        $pdo->beginTransaction();
        try {
            [$themeId, $docId] = $this->seedThemeAndDoc($pdo);

            epuriel_store_ai_suggestions($pdo, $docId, $themeId, ['foi', 'amour']);

            $row = $pdo->query("SELECT theme_id, theme_suggested_id FROM documents WHERE id=$docId")->fetch();
            // Le thème suggéré est posé, le thème validé reste vide.
            $this->assertNull($row['theme_id']);
            $this->assertSame($themeId, (int) $row['theme_suggested_id']);

            // Mots-clés insérés en 'ai_suggested' (proposés, pas validés).
            $kws = $pdo->query(
                "SELECT k.mot, ldk.source FROM lot_document_keywords ldk
                 JOIN keywords k ON k.id = ldk.keyword_id
                 WHERE ldk.document_id=$docId ORDER BY k.mot"
            )->fetchAll();
            $this->assertCount(2, $kws);
            foreach ($kws as $kw) {
                $this->assertSame('ai_suggested', $kw['source']);
            }
        } finally {
            $pdo->rollBack();
        }
    }

    public function testStoreSuggestionsNormalizesKeywordCasing(): void
    {
        $pdo = \Tests\Dal\TestHelper::getTestPdo();
        $pdo->beginTransaction();
        try {
            [$themeId, $docId] = $this->seedThemeAndDoc($pdo);

            // L'IA propose « Évolution » (É majuscule accentué) → stocké « Evolution ».
            epuriel_store_ai_suggestions($pdo, $docId, $themeId, ['Évolution']);

            $mot = $pdo->query(
                "SELECT k.mot FROM lot_document_keywords ldk
                 JOIN keywords k ON k.id = ldk.keyword_id WHERE ldk.document_id=$docId"
            )->fetchColumn();
            $this->assertSame('Evolution', $mot);
        } finally {
            $pdo->rollBack();
        }
    }

    public function testSuggestionsDoNotMakeLotConforme(): void
    {
        $pdo = \Tests\Dal\TestHelper::getTestPdo();
        $pdo->beginTransaction();
        try {
            [$themeId, $docId] = $this->seedThemeAndDoc($pdo);
            epuriel_store_ai_suggestions($pdo, $docId, $themeId, ['foi']);

            // Le comptage de conformité ne retient que le validé/humain : 0 ici.
            $counts = _dal_count_keywords_per_document($pdo, [$docId]);
            $this->assertSame(0, $counts[$docId] ?? 0);
        } finally {
            $pdo->rollBack();
        }
    }

    public function testStoreSuggestionsNeverOverwritesManualKeyword(): void
    {
        $pdo = \Tests\Dal\TestHelper::getTestPdo();
        $pdo->beginTransaction();
        try {
            [$themeId, $docId] = $this->seedThemeAndDoc($pdo);

            // Mot-clé déjà validé (hashtag → 'manual').
            $pdo->prepare("INSERT INTO keywords (mot) VALUES ('foi')")->execute();
            $kwId = (int) $pdo->lastInsertId();
            $pdo->prepare("INSERT INTO lot_document_keywords (document_id, keyword_id, source)
                           VALUES (?, ?, 'manual')")->execute([$docId, $kwId]);

            // L'IA resuggère le même mot : il doit RESTER 'manual'.
            epuriel_store_ai_suggestions($pdo, $docId, $themeId, ['foi']);

            $source = $pdo->query(
                "SELECT source FROM lot_document_keywords WHERE document_id=$docId AND keyword_id=$kwId"
            )->fetchColumn();
            $this->assertSame('manual', $source);
        } finally {
            $pdo->rollBack();
        }
    }

    public function testStoreSuggestionsDoesNotOverwriteValidatedTheme(): void
    {
        $pdo = \Tests\Dal\TestHelper::getTestPdo();
        $pdo->beginTransaction();
        try {
            [$themeId, $docId] = $this->seedThemeAndDoc($pdo);
            // Thème déjà validé à la main.
            $pdo->prepare("UPDATE documents SET theme_id=? WHERE id=?")->execute([$themeId, $docId]);

            $pdo->prepare("INSERT INTO themes (nom, parent_id) VALUES ('Autre', NULL)")->execute();
            $autre = (int) $pdo->lastInsertId();

            epuriel_store_ai_suggestions($pdo, $docId, $autre, ['x']);

            // Le thème validé est préservé ; on ne pose pas de suggestion par-dessus.
            $row = $pdo->query("SELECT theme_id, theme_suggested_id FROM documents WHERE id=$docId")->fetch();
            $this->assertSame($themeId, (int) $row['theme_id']);
            $this->assertNull($row['theme_suggested_id']);
        } finally {
            $pdo->rollBack();
        }
    }
}
