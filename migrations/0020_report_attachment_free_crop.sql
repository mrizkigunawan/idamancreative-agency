ALTER TABLE `social_report_attachments` ADD COLUMN `crop_x` integer DEFAULT 0 NOT NULL;
ALTER TABLE `social_report_attachments` ADD COLUMN `crop_width` integer DEFAULT 100 NOT NULL;
ALTER TABLE `social_report_attachments` ADD COLUMN `crop_height` integer DEFAULT 100 NOT NULL;
ALTER TABLE `social_report_attachments` ADD COLUMN `image_width` integer DEFAULT 0 NOT NULL;
ALTER TABLE `social_report_attachments` ADD COLUMN `image_height` integer DEFAULT 0 NOT NULL;
UPDATE `social_report_attachments` SET `crop_x` = 0, `crop_y` = 0, `crop_width` = 100, `crop_height` = 100;
