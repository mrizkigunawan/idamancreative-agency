CREATE TABLE `content_plan_shares` (
  `id` text PRIMARY KEY NOT NULL,
  `brand_id` text NOT NULL REFERENCES `brands`(`id`) ON DELETE CASCADE,
  `month` text NOT NULL,
  `token_hash` text NOT NULL UNIQUE,
  `created_at` integer NOT NULL,
  `expires_at` integer NOT NULL,
  `revoked_at` integer
);

CREATE TABLE `content_plan_comments` (
  `id` text PRIMARY KEY NOT NULL,
  `share_id` text NOT NULL REFERENCES `content_plan_shares`(`id`) ON DELETE CASCADE,
  `author_name` text NOT NULL,
  `body` text NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX `content_plan_comments_share_created_idx` ON `content_plan_comments` (`share_id`, `created_at`);
