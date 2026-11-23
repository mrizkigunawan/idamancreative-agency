CREATE TABLE `social_report_attachments` (
  `id` text PRIMARY KEY NOT NULL,
  `report_id` text NOT NULL REFERENCES `social_reports`(`id`) ON DELETE cascade,
  `title` text DEFAULT '' NOT NULL,
  `filename` text NOT NULL,
  `mime` text NOT NULL,
  `file_data` BLOB NOT NULL,
  `size_bytes` integer NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `crop_y` integer DEFAULT 50 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE INDEX `social_report_attachments_report_order_idx` ON `social_report_attachments` (`report_id`, `sort_order`);
