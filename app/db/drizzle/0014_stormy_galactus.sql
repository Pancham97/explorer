CREATE TABLE IF NOT EXISTS `metadata` (
	`id` varchar(255) NOT NULL,
	`strippedUrl` varchar(4096) NOT NULL,
	`metadata` json,
	CONSTRAINT `metadata_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users_table` ADD `source` varchar(255);
