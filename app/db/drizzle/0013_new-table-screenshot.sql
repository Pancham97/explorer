CREATE TABLE `screenshot` (
	`id` varchar(255) NOT NULL,
	`url` varchar(4096) NOT NULL,
	`screenshotUrl` varchar(4096) NOT NULL,
	CONSTRAINT `screenshot_id` PRIMARY KEY(`id`)
);
