<?php
declare(strict_types=1);

require_once __DIR__ . '/core.php';

const PASSWORD_BLACKLIST = [
    'password', 'motdepasse', '12345678', '123456789', '1234567890',
    'password1', 'qwerty', 'azerty', 'iloveyou', 'lumosphere',
    'admin', 'welcome', 'letmein', 'monkey', 'dragon',
];

/**
 * Valide un mot de passe selon les règles du rôle.
 * Retourne [] si valide, sinon un tableau de messages d'erreur.
 *
 * @param string $email  Email de l'utilisateur (pour vérifier la ressemblance)
 * @param string $prenom Prénom (idem)
 * @param string $nom    Nom (idem)
 */
function dal_password_validate(
    string $password,
    int $role_id,
    string $email = '',
    string $prenom = '',
    string $nom = ''
): array {
    $errors = [];
    $is_privileged = in_array($role_id, [ROLE_ADMIN, ROLE_EDITEUR], true);
    $min_length = $is_privileged ? 12 : 8;
    $len = mb_strlen($password);

    if ($len < $min_length) {
        $errors[] = "Le mot de passe doit contenir au moins {$min_length} caractères.";
        return $errors;
    }

    // Liste noire (insensible à la casse)
    $lower = mb_strtolower($password);
    if (in_array($lower, PASSWORD_BLACKLIST, true)) {
        $errors[] = 'Ce mot de passe est trop commun, choisissez-en un autre.';
    }

    // Ressemblance avec le contexte utilisateur (prénom ≥ 4 lettres, nom ≥ 4, partie locale de l'email ≥ 4)
    $email_local = (string) strstr($email, '@', true);
    $context_words = array_filter([
        mb_strlen($prenom)      >= 4 ? mb_strtolower($prenom)      : '',
        mb_strlen($nom)         >= 4 ? mb_strtolower($nom)         : '',
        mb_strlen($email_local) >= 4 ? mb_strtolower($email_local) : '',
    ], fn($w) => $w !== '');
    foreach ($context_words as $word) {
        if (str_contains($lower, $word)) {
            $errors[] = 'Le mot de passe ne doit pas contenir votre prénom, nom ou identifiant email.';
            break;
        }
    }

    // Vérification de force via zxcvbn
    $zxcvbn = new \ZxcvbnPhp\Zxcvbn();
    $result = $zxcvbn->passwordStrength($password, array_values($context_words));
    $score = $result['score']; // 0–4

    if ($is_privileged) {
        if ($score < 3) {
            $errors[] = 'Ce mot de passe n\'est pas assez robuste. Utilisez un mot de passe fort (barre verte).';
        }
    } elseif ($score < 2) {
        $errors[] = 'Ce mot de passe est trop facile à deviner.';
    }

    return $errors;
}
