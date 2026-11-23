ALTER TABLE `content_plan_shares` ADD COLUMN `content_id` text REFERENCES `contents`(`id`) ON DELETE CASCADE;
