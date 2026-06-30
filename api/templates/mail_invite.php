<?php
declare(strict_types=1);

/**
 * @return array{subject: string, html: string, text: string}
 */
function mail_template_invite(string $prenom, string $set_url, int $expires_days = 7): array
{
    $subject = 'Bienvenue sur Lumosphère — Définissez votre mot de passe';
    $prenom_h = htmlspecialchars($prenom, ENT_QUOTES, 'UTF-8');
    $url_h    = htmlspecialchars($set_url, ENT_QUOTES, 'UTF-8');

    $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>{$subject}</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
  <h2 style="color:#2563eb;">Bienvenue sur Lumosphère, {$prenom_h}&nbsp;!</h2>
  <p>Votre compte a été créé. Cliquez sur le lien ci-dessous pour définir votre mot de passe :</p>
  <p style="text-align:center;margin:32px 0;">
    <a href="{$url_h}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
      Définir mon mot de passe
    </a>
  </p>
  <p style="color:#666;font-size:0.9em;">Ce lien est valable {$expires_days} jours. Passé ce délai, demandez un nouvel envoi à l'administrateur.</p>
  <p style="color:#999;font-size:0.8em;">Si vous n'attendiez pas cet email, ignorez-le.</p>
</body>
</html>
HTML;

    $text = "Bienvenue sur Lumosphère, {$prenom} !\n\n"
          . "Définissez votre mot de passe en suivant ce lien :\n{$set_url}\n\n"
          . "Ce lien est valable {$expires_days} jours.\n"
          . "Si vous n'attendiez pas cet email, ignorez-le.";

    return compact('subject', 'html', 'text');
}
