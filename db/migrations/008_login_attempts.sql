-- Lumosphère — Migration 008 : table login_attempts (T07)
-- Cible : MariaDB 11.4.12 (o2switch), base mist2786_lumosphere

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_520_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email            VARCHAR(255) NOT NULL,
  attempt_count    INT UNSIGNED NOT NULL DEFAULT 0,
  last_attempt_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_login_attempts_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- Fin migration 008.
