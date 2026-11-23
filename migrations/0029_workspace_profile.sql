CREATE TABLE `workspace_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Idaman Creative' NOT NULL,
	`tagline` text DEFAULT 'Agency operating system' NOT NULL,
	`owner_name` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`updated_at` integer NOT NULL
);
