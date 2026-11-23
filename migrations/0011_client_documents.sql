CREATE TABLE `client_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL REFERENCES `brands`(`id`) ON DELETE CASCADE,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`document_number` text DEFAULT '' NOT NULL,
	`issue_date` text NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`sections` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `client_documents_brand_idx` ON `client_documents` (`brand_id`);
