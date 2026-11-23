ALTER TABLE `brands` ADD COLUMN `handled_platforms` text NOT NULL DEFAULT '[]';
UPDATE `brands`
SET `handled_platforms` = '["Instagram"]'
WHERE lower(`notes`) LIKE '%instagram%'
   OR lower(`platform_links`) LIKE '%instagram%';
