-- db/migrations/018_password_tokens.sql
-- Colonne de suivi d'activation du compte
ALTER TABLE users
    ADD COLUMN password_set_at DATETIME NULL DEFAULT NULL AFTER updated_at;

-- Les comptes existants ont déjà un mot de passe : marquer comme activés
UPDATE users SET password_set_at = created_at WHERE password_set_at IS NULL;

-- Table des jetons à usage unique (invitation + réinitialisation)
CREATE TABLE password_tokens (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NOT NULL,
    token_hash CHAR(64)     NOT NULL COMMENT 'SHA-256 hex du jeton brut',
    type       ENUM('invite','reset') NOT NULL,
    expires_at DATETIME     NOT NULL,
    used_at    DATETIME     NULL DEFAULT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_ip VARCHAR(45)  NOT NULL DEFAULT '',
    UNIQUE KEY uq_token_hash (token_hash),
    INDEX      idx_user_type (user_id, type),
    CONSTRAINT fk_pt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- Table de rate-limiting pour les demandes de réinitialisation par email
CREATE TABLE password_reset_attempts (
    email           VARCHAR(255) NOT NULL,
    attempt_count   INT          NOT NULL DEFAULT 1,
    last_attempt_at DATETIME     NOT NULL,
    PRIMARY KEY (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
