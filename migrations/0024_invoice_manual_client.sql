ALTER TABLE transactions ADD COLUMN manual_client_name TEXT NOT NULL DEFAULT '';
ALTER TABLE transactions ADD COLUMN manual_client_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE transactions ADD COLUMN manual_client_address TEXT NOT NULL DEFAULT '';
