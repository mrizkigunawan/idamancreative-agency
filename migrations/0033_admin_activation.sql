-- A single installation grant. Keep the completion marker even if an account is removed.
CREATE TABLE admin_setup (
  id TEXT PRIMARY KEY NOT NULL CHECK (id = 'workspace'),
  token_hash TEXT NOT NULL CHECK (length(token_hash) = 64),
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  completed_user_id TEXT
);

-- Existing installations are already activated; this migration never reopens setup.
INSERT INTO admin_setup (id, token_hash, email, created_at, expires_at, consumed_at, completed_user_id)
SELECT 'workspace', '0000000000000000000000000000000000000000000000000000000000000000', email,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000, CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000, id FROM "user" LIMIT 1;

CREATE TRIGGER admin_setup_no_reopen_insert BEFORE INSERT ON admin_setup
WHEN EXISTS (SELECT 1 FROM "user") OR EXISTS (SELECT 1 FROM admin_setup WHERE consumed_at IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'admin activation is already closed');
END;

CREATE TRIGGER admin_setup_no_reopen_update BEFORE UPDATE OF token_hash, email, created_at, expires_at ON admin_setup
WHEN OLD.consumed_at IS NOT NULL OR EXISTS (SELECT 1 FROM "user")
BEGIN
  SELECT RAISE(ABORT, 'admin activation is already closed');
END;
