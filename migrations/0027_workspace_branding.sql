CREATE TABLE `workspace_branding` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`file_data` blob NOT NULL,
	`size_bytes` integer NOT NULL,
	`updated_at` integer NOT NULL
);
