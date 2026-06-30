-- Rollback 019 : supprimer la table de rate-limiting IP pour forgot-password
DROP TABLE IF EXISTS password_reset_attempts_ip;
