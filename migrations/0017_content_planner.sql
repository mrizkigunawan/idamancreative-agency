ALTER TABLE contents ADD COLUMN pillar TEXT NOT NULL DEFAULT '';
ALTER TABLE contents ADD COLUMN funnel TEXT NOT NULL DEFAULT '';
ALTER TABLE contents ADD COLUMN objective TEXT NOT NULL DEFAULT '';
ALTER TABLE contents ADD COLUMN scene_breakdown TEXT NOT NULL DEFAULT '';
ALTER TABLE contents ADD COLUMN hashtags TEXT NOT NULL DEFAULT '';
ALTER TABLE contents ADD COLUMN cta TEXT NOT NULL DEFAULT '';
ALTER TABLE contents ADD COLUMN posting_time TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE contents ADD COLUMN thumbnail_url TEXT NOT NULL DEFAULT '';
ALTER TABLE contents ADD COLUMN internal_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE contents ADD COLUMN feed_order INTEGER;
CREATE INDEX IF NOT EXISTS contents_feed_order_idx ON contents(brand_id, feed_order);
CREATE TABLE IF NOT EXISTS brand_social_profiles (
  brand_id TEXT PRIMARY KEY NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  profile_picture_url TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  highlights TEXT NOT NULL DEFAULT '[]',
  pinned_content_ids TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL
);
