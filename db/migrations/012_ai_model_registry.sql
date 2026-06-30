-- Migration 012 — Registre des modèles IA
-- Idempotente : passe sur base serveur (tables déjà présentes) et base dev neuve.

-- Cache du catalogue communautaire LiteLLM (prix / capacités)
CREATE TABLE IF NOT EXISTS `ia_model_catalog_cache` (
  `provider`      VARCHAR(64)   NOT NULL,
  `catalog_json`  LONGTEXT      CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (JSON_VALID(`catalog_json`)),
  `refreshed_at`  DATETIME      DEFAULT NULL,
  `expires_at`    DATETIME      DEFAULT NULL,
  `last_error`    TEXT          DEFAULT NULL,
  `updated_by`    VARCHAR(128)  DEFAULT NULL,
  `updated_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registre des modèles IA par fournisseur
CREATE TABLE IF NOT EXISTS `ia_model_registry` (
  `provider`                       VARCHAR(64)    NOT NULL,
  `model_id`                       VARCHAR(191)   NOT NULL,
  `label`                          VARCHAR(191)   NOT NULL,
  `enabled`                        TINYINT(1)     NOT NULL DEFAULT 0,
  `access_tier`                    VARCHAR(16)    NOT NULL DEFAULT 'unknown',
  `pricing_input_per_million_usd`  DECIMAL(10,4)  DEFAULT NULL,
  `pricing_output_per_million_usd` DECIMAL(10,4)  DEFAULT NULL,
  `pricing_source`                 VARCHAR(32)    NOT NULL DEFAULT 'unknown',
  `notes`                          TEXT           DEFAULT NULL,
  `is_visible_with_key`            TINYINT(1)     NOT NULL DEFAULT 0,
  `last_seen_at`                   DATETIME       DEFAULT NULL,
  `last_refreshed_at`              DATETIME       DEFAULT NULL,
  `updated_by`                     VARCHAR(128)   DEFAULT NULL,
  `updated_at`                     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`provider`, `model_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Colonnes additionnelles (ADD COLUMN IF NOT EXISTS = idempotent sur MariaDB 10.0+)
ALTER TABLE `ia_model_registry`
  ADD COLUMN IF NOT EXISTS `context_window`  INT UNSIGNED NOT NULL DEFAULT 0     AFTER `pricing_source`,
  ADD COLUMN IF NOT EXISTS `supports_json`   TINYINT(1)   NOT NULL DEFAULT 0     AFTER `context_window`,
  ADD COLUMN IF NOT EXISTS `supports_vision` TINYINT(1)   NOT NULL DEFAULT 0     AFTER `supports_json`,
  ADD COLUMN IF NOT EXISTS `deprecated`      TINYINT(1)   NOT NULL DEFAULT 0     AFTER `supports_vision`;

-- Index de filtrage (activés par fournisseur)
CREATE INDEX IF NOT EXISTS `idx_registry_enabled` ON `ia_model_registry` (`provider`, `enabled`);

-- Colonnes de classification des erreurs IA dans ai_logs
ALTER TABLE `ai_logs`
  ADD COLUMN IF NOT EXISTS `error_type`   VARCHAR(32) NULL AFTER `error_message`,
  ADD COLUMN IF NOT EXISTS `error_origin` VARCHAR(16) NULL AFTER `error_type`;
