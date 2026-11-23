ALTER TABLE brands ADD COLUMN platform_links TEXT NOT NULL DEFAULT '{}';
ALTER TABLE brands ADD COLUMN canva_feed_url TEXT NOT NULL DEFAULT '';
ALTER TABLE brands ADD COLUMN canva_cover_url TEXT NOT NULL DEFAULT '';
ALTER TABLE brands ADD COLUMN canva_story_url TEXT NOT NULL DEFAULT '';

CREATE TABLE brand_decks (
  brand_id TEXT PRIMARY KEY NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_data BLOB NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at INTEGER NOT NULL
);
