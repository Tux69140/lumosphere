<?php
declare(strict_types=1);
namespace Tests\Dal;

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../api/dal/core.php';
require_once __DIR__ . '/../../api/dal/password_policy.php';

class PasswordPolicyTest extends TestCase
{
    // Abonnés : min 8 caractères
    public function testAbo3AcceptsEightChars(): void
    {
        $this->assertSame([], dal_password_validate('abcdefgh', ROLE_ABO3));
    }

    public function testAbo3RejectsSevenChars(): void
    {
        $errors = dal_password_validate('abcdefg', ROLE_ABO3);
        $this->assertNotEmpty($errors);
    }

    // Éditeur/Admin : min 12 caractères
    public function testAdminRejectsElevenChars(): void
    {
        $errors = dal_password_validate('abcdefghijk', ROLE_ADMIN);
        $this->assertNotEmpty($errors);
    }

    public function testEditeurRejectsTwelveCharsIfWeak(): void
    {
        // 12 chars mais toutes minuscules = pas fort
        $errors = dal_password_validate('abcdefghijkl', ROLE_EDITEUR);
        $this->assertNotEmpty($errors);
    }

    public function testAdminAcceptsTwelveCharsStrong(): void
    {
        // 12 chars avec 3 classes = fort
        $errors = dal_password_validate('Abcdefg1234!', ROLE_ADMIN);
        $this->assertSame([], $errors);
    }

    public function testAdminAcceptsTwentyCharsAllLower(): void
    {
        // ≥ 20 chars = acceptable même sans diversité (phrase de passe)
        $errors = dal_password_validate('monchatesteunprogrammeur', ROLE_ADMIN);
        $this->assertSame([], $errors);
    }

    // Liste noire
    public function testBlacklistRejected(): void
    {
        $errors = dal_password_validate('motdepasse', ROLE_ABO3);
        $this->assertNotEmpty($errors);
    }

    public function testBlacklistCaseInsensitive(): void
    {
        $errors = dal_password_validate('MOTDEPASSE', ROLE_ABO3);
        $this->assertNotEmpty($errors);
    }

    // Ressemblance contexte utilisateur
    public function testRejectsPasswordContainingPrenom(): void
    {
        $errors = dal_password_validate('Jean1234!XYZ', ROLE_ADMIN, 'jean@test.com', 'Jean', 'Dupont');
        $this->assertNotEmpty($errors);
    }

    public function testRejectsPasswordContainingEmailLocal(): void
    {
        $errors = dal_password_validate('testuser1234!A', ROLE_ADMIN, 'testuser@test.com', 'Jean', 'Dupont');
        $this->assertNotEmpty($errors);
    }

    public function testAcceptsPasswordUnrelatedToUser(): void
    {
        $errors = dal_password_validate('Pluie&Soleil99!', ROLE_ADMIN, 'jean@test.com', 'Jean', 'Dupont');
        $this->assertSame([], $errors);
    }

    public function testShortEmailLocalDoesNotCauseFalsePositive(): void
    {
        // Email local 'jo' (2 chars < 4) ne doit pas bloquer un MdP le contenant
        $errors = dal_password_validate('Projoint99!XYZ', ROLE_ADMIN, 'jo@test.com', 'Test', 'User');
        $this->assertSame([], $errors);
    }

    // Règle de force Admin/Éditeur
    public function testAdminRequiresThreeCharClasses(): void
    {
        // 14 chars mais 2 classes seulement (minuscules + majuscules)
        $errors = dal_password_validate('AbcDefGhiJklMn', ROLE_ADMIN);
        $this->assertNotEmpty($errors);
    }

    public function testAdminAcceptsThreeCharClasses(): void
    {
        $errors = dal_password_validate('AbcDefGhi123', ROLE_ADMIN);
        $this->assertSame([], $errors);
    }
}
