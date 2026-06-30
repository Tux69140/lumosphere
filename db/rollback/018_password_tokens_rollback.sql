-- db/rollback/018_password_tokens_rollback.sql
DROP TABLE IF EXISTS password_reset_attempts;
DROP TABLE IF EXISTS password_tokens;
ALTER TABLE users DROP COLUMN IF EXISTS password_set_at;
