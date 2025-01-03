-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `users_table` (
	`id` varchar(255) NOT NULL,
	`birth_date` date,
	`email` varchar(255) NOT NULL,
	`login_provider` varchar(255) NOT NULL,
	`first_name` varchar(255) NOT NULL,
	`last_name` varchar(255),
	`password` varchar(255),
	`picture` varchar(255),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `users_table_id` PRIMARY KEY(`id`)
);

*/