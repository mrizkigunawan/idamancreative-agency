ALTER TABLE prospects ADD COLUMN next_follow_up_date TEXT;
ALTER TABLE prospects ADD COLUMN next_action TEXT NOT NULL DEFAULT '';
