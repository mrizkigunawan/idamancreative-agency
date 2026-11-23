ALTER TABLE inventory_items ADD COLUMN purchase_method TEXT NOT NULL DEFAULT '';
ALTER TABLE inventory_items ADD COLUMN purchase_details TEXT NOT NULL DEFAULT '';
