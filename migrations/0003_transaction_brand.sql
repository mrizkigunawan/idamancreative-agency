ALTER TABLE transactions ADD COLUMN brand_id TEXT REFERENCES brands(id) ON DELETE SET NULL;
CREATE INDEX transactions_brand_idx ON transactions(brand_id);
