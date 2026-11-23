CREATE TABLE IF NOT EXISTS content_thumbnails (
  content_id TEXT PRIMARY KEY NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  file_data BLOB NOT NULL,
  size_bytes INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
