CREATE TABLE `item` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text,
	`description` varchar(255),
	`type` enum('file','url','text') NOT NULL,
	`thumbnail_url` varchar(255),
	`favicon_url` varchar(255),
	`tags` json,
	`is_favorite` tinyint NOT NULL DEFAULT 0,
	`metadata` json,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	`last_accessed_at` timestamp,
	`url` varchar(4096),
	CONSTRAINT `item_id` PRIMARY KEY(`id`)
);
