CREATE TABLE `provider` (
	`id` varchar(255) NOT NULL,
	`user_id` varchar(255) NOT NULL,
	`provider` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `providers_id` PRIMARY KEY(`id`)
);
