CREATE TABLE IF NOT EXISTS brand_notes (
  id TEXT PRIMARY KEY NOT NULL,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Lainnya',
  details TEXT NOT NULL DEFAULT '',
  due_date TEXT,
  is_done INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS brand_notes_brand_idx ON brand_notes(brand_id);
CREATE INDEX IF NOT EXISTS brand_notes_due_idx ON brand_notes(due_date, is_done);
