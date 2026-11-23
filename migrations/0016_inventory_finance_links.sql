ALTER TABLE transactions ADD COLUMN inventory_item_id TEXT;
ALTER TABLE inventory_items ADD COLUMN linked_transaction_id TEXT;
CREATE INDEX IF NOT EXISTS transactions_inventory_item_idx ON transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS inventory_items_linked_transaction_idx ON inventory_items(linked_transaction_id);
