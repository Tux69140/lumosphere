<?php
declare(strict_types=1);

/**
 * @return array{subject: string, html: string, text: string}
 */
function mail_template_reset(string $prenom, string $reset_url): array
{
    $subject  = 'Lumosphère — Réinitialisation de votre mot de passe';
    $prenom_h = htmlspecialchars($prenom, ENT_QUOTES, 'UTF-8');
    $url_h    = htmlspecialchars($reset_url, ENT_QUOTES, 'UTF-8');

    $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>{$subject}</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <h2 style="color:#2563eb;">Réinitialisation de mot de passe</h2>
  <p>Bonjour {$prenom_h},</p>
  <p>Une demande de réinitialisation de mot de passe a été effectuée pour votre compte Lumosphère.</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="{$url_h}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
      Choisir un nouveau mot de passe
    </a>
  </p>
  <p style="color:#666;font-size:0.9em;">Ce lien est valable <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe reste inchangé.</p>
</body>
</html>
HTML;

    $text = "Bonjour {$prenom},\n\n"
          . "Une demande de réinitialisation de mot de passe a été effectuée pour votre compte Lumosphère.\n\n"
          . "Choisissez un nouveau mot de passe ici (valable 1 heure) :\n{$reset_url}\n\n"
          . "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.";

    return compact('subject', 'html', 'text');
}
