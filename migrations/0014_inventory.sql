CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  serial_number TEXT NOT NULL DEFAULT '',
  buyer_name TEXT NOT NULL DEFAULT '',
  purchase_date TEXT,
  purchase_price INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT NOT NULL DEFAULT 'Baik',
  status TEXT NOT NULL DEFAULT 'Digunakan',
  location TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  receipt_data BLOB,
  receipt_filename TEXT,
  receipt_mime TEXT,
  receipt_size_bytes INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS inventory_items_name_idx ON inventory_items(name);
CREATE INDEX IF NOT EXISTS inventory_items_brand_idx ON inventory_items(brand);
CREATE INDEX IF NOT EXISTS inventory_items_status_idx ON inventory_items(status);
