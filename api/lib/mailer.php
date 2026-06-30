<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;

/**
 * Envoie un email via SMTP (config dans $GLOBALS['app_config']['smtp']).
 * Si SMTP non configuré, logue un avertissement et retourne sans erreur.
 */
function send_mail(
    string $to_email,
    string $to_name,
    string $subject,
    string $html_body,
    string $text_body
): void {
    $smtp = $GLOBALS['app_config']['smtp'] ?? null;
    if (!$smtp || empty($smtp['host']) || empty($smtp['username'])) {
        error_log("send_mail: SMTP non configuré, mail à {$to_email} non envoyé.");
        return;
    }

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = $smtp['host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $smtp['username'];
        $mail->Password   = $smtp['password'];
        $mail->SMTPSecure = $smtp['encryption'] === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int) $smtp['port'];
        $mail->CharSet    = 'UTF-8';

        $mail->setFrom($smtp['from_email'], $smtp['from_name']);
        $mail->addReplyTo($smtp['reply_to'], $smtp['from_name']);
        $mail->addAddress($to_email, $to_name);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $html_body;
        $mail->AltBody = $text_body;

        $mail->send();
    } catch (\Exception $e) {
        error_log("send_mail: échec envoi à {$to_email} — " . $e->getMessage());
        throw new \RuntimeException("L'envoi de l'email a échoué. Veuillez contacter l'administrateur.");
    }
}
