CREATE TABLE `social_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL REFERENCES `brands`(`id`) ON DELETE cascade,
	`month` text NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`platforms` text DEFAULT '[]' NOT NULL,
	`metrics` text DEFAULT '{}' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`insights` text DEFAULT '' NOT NULL,
	`next_plan` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX `social_reports_brand_month_unique` ON `social_reports` (`brand_id`,`month`);
