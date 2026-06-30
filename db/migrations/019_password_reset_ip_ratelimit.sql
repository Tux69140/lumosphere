-- Migration 019 : rate-limiting par IP sur forgot-password
-- Complémente password_reset_attempts (par email) avec un garde par adresse IP

CREATE TABLE IF NOT EXISTS password_reset_attempts_ip (
    ip VARCHAR(45) NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    last_attempt_at DATETIME NOT NULL,
    PRIMARY KEY (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
