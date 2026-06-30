-- Lumosphère — Migration 013 : table login_attempts_ip (anti-force-brute par IP)
-- Complément de 008_login_attempts (par e-mail). Sécurité : empêche le brute-force
-- multi-comptes depuis une même IP et limite le blocage volontaire d'un compte ciblé.
-- Cible : MariaDB 11.4.12 (o2switch), base mist2786_lumosphere

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;

CREATE TABLE IF NOT EXISTS login_attempts_ip (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip               VARCHAR(45) NOT NULL, -- IPv4 ou IPv6
  attempt_count    INT UNSIGNED NOT NULL DEFAULT 0,
  last_attempt_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_login_attempts_ip (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- Fin migration 013.
