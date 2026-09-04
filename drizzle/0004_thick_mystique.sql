CREATE TABLE `pushSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` varchar(500) NOT NULL,
	`p256dh` varchar(200) NOT NULL,
	`auth` varchar(100) NOT NULL,
	`userAgent` varchar(300),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pushSubscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_subscription_endpoint_unique` UNIQUE(`endpoint`)
);
--> statement-breakpoint
ALTER TABLE `pushSubscriptions` ADD CONSTRAINT `pushSubscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `push_subscription_user_idx` ON `pushSubscriptions` (`userId`);