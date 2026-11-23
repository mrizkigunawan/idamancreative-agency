CREATE TABLE brand_decks_new (
  id TEXT PRIMARY KEY NOT NULL,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_data BLOB NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at INTEGER NOT NULL
);
INSERT INTO brand_decks_new (id, brand_id, filename, file_data, size_bytes, uploaded_at)
SELECT lower(hex(randomblob(16))), brand_id, filename, file_data, size_bytes, uploaded_at
FROM brand_decks;
DROP TABLE brand_decks;
ALTER TABLE brand_decks_new RENAME TO brand_decks;
CREATE INDEX brand_decks_brand_idx ON brand_decks(brand_id);
