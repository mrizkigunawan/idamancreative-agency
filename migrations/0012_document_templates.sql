ALTER TABLE `client_documents` ADD COLUMN `template_key` text DEFAULT 'custom' NOT NULL;
--> statement-breakpoint
ALTER TABLE `client_documents` ADD COLUMN `template_fields` text DEFAULT '{}' NOT NULL;
