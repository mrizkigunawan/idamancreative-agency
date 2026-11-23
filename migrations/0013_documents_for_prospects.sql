CREATE TABLE `client_documents_new` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text REFERENCES `brands`(`id`) ON DELETE CASCADE,
	`prospect_id` text REFERENCES `prospects`(`id`) ON DELETE CASCADE,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`document_number` text DEFAULT '' NOT NULL,
	`template_key` text DEFAULT 'custom' NOT NULL,
	`template_fields` text DEFAULT '{}' NOT NULL,
	`issue_date` text NOT NULL,
	`status` text DEFAULT 'Draft' NOT NULL,
	`sections` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CHECK ((`brand_id` IS NOT NULL AND `prospect_id` IS NULL) OR (`brand_id` IS NULL AND `prospect_id` IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO `client_documents_new` (`id`, `brand_id`, `prospect_id`, `type`, `title`, `document_number`, `template_key`, `template_fields`, `issue_date`, `status`, `sections`, `created_at`, `updated_at`)
SELECT `id`, `brand_id`, NULL, `type`, `title`, `document_number`, `template_key`, `template_fields`, `issue_date`, `status`, `sections`, `created_at`, `updated_at`
FROM `client_documents`;
--> statement-breakpoint
DROP TABLE `client_documents`;
--> statement-breakpoint
ALTER TABLE `client_documents_new` RENAME TO `client_documents`;
--> statement-breakpoint
CREATE INDEX `client_documents_brand_idx` ON `client_documents` (`brand_id`);
--> statement-breakpoint
CREATE INDEX `client_documents_prospect_idx` ON `client_documents` (`prospect_id`);
