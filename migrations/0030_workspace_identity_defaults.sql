-- Replace installation-specific defaults without changing existing settings,
-- payment destinations, transaction IDs, or inventory links.
CREATE TABLE workspace_profile_new (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL DEFAULT 'Agency Workspace',
  tagline TEXT NOT NULL DEFAULT 'Agency operating system',
  owner_name TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL
);
INSERT INTO workspace_profile_new SELECT * FROM workspace_profile;
DROP TABLE workspace_profile;
ALTER TABLE workspace_profile_new RENAME TO workspace_profile;

-- No tables have foreign keys into transactions. Copy the outgoing brand
-- reference and restore all indexes after rebuilding its column defaults.
CREATE TABLE transactions_new (
  id TEXT PRIMARY KEY NOT NULL,
  brand_id TEXT REFERENCES brands(id) ON DELETE SET NULL,
  inventory_item_id TEXT,
  manual_client_name TEXT NOT NULL DEFAULT '',
  manual_client_phone TEXT NOT NULL DEFAULT '',
  manual_client_address TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL,
  amount INTEGER NOT NULL, items TEXT NOT NULL DEFAULT '[]',
  payment_account_name TEXT NOT NULL DEFAULT '',
  payment_bank_name TEXT NOT NULL DEFAULT '',
  payment_account_number TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Lunas',
  notes TEXT NOT NULL DEFAULT ''
);
INSERT INTO transactions_new (
  id, brand_id, inventory_item_id, manual_client_name, manual_client_phone,
  manual_client_address, type, title, category, amount, items,
  payment_account_name, payment_bank_name, payment_account_number, date, status, notes
) SELECT
  id, brand_id, inventory_item_id, manual_client_name, manual_client_phone,
  manual_client_address, type, title, category, amount, items,
  payment_account_name, payment_bank_name, payment_account_number, date, status, notes
FROM transactions;
DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;
CREATE INDEX transactions_date_idx ON transactions(date);
CREATE INDEX transactions_brand_idx ON transactions(brand_id);
CREATE INDEX transactions_inventory_item_idx ON transactions(inventory_item_id);
