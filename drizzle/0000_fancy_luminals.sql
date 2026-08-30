CREATE TABLE `alumniProfiles` (
	`userId` int NOT NULL,
	`promotionId` int,
	`firstName` varchar(100),
	`lastName` varchar(100),
	`headline` varchar(180),
	`organization` varchar(180),
	`jobTitle` varchar(180),
	`bio` text,
	`location` varchar(120),
	`avatarStorageKey` varchar(512),
	`directoryVisibility` enum('network','promotion_only','private') NOT NULL DEFAULT 'network',
	`mentorAvailable` boolean NOT NULL DEFAULT false,
	`mentorTopics` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alumniProfiles_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int,
	`actorRole` varchar(32),
	`action` varchar(120) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(80) NOT NULL,
	`reason` text,
	`before` json,
	`after` json,
	`requestId` varchar(80),
	`ipHash` varchar(128),
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userAId` int NOT NULL,
	`userBId` int NOT NULL,
	`initiatedById` int NOT NULL,
	`status` enum('pending','accepted','declined','blocked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`respondedAt` timestamp,
	CONSTRAINT `connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `connection_pair_unique` UNIQUE(`userAId`,`userBId`)
);
--> statement-breakpoint
CREATE TABLE `conversationMembers` (
	`conversationId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`leftAt` timestamp,
	`lastReadMessageId` int,
	`mutedAt` timestamp,
	CONSTRAINT `conversation_member_unique` UNIQUE(`conversationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('direct','group') NOT NULL DEFAULT 'direct',
	`directPairKey` varchar(40),
	`title` varchar(160),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastMessageAt` timestamp,
	`archivedAt` timestamp,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversations_directPairKey_unique` UNIQUE(`directPairKey`)
);
--> statement-breakpoint
CREATE TABLE `messageAttachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`sizeBytes` int NOT NULL,
	`durationMs` int,
	`thumbnailKey` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messageAttachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `storage_key_unique` UNIQUE(`storageKey`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderId` int NOT NULL,
	`body` text,
	`kind` enum('text','attachment','voice','system') NOT NULL DEFAULT 'text',
	`replyToId` int,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`editedAt` timestamp,
	`deletedAt` timestamp,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`label` varchar(120),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`),
	CONSTRAINT `promotions_year_unique` UNIQUE(`year`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` enum('alumni','mentor','moderator','administrator') NOT NULL,
	`label` varchar(80) NOT NULL,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `userRoles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`roleId` int NOT NULL,
	`assignedBy` int,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`reason` varchar(500),
	CONSTRAINT `userRoles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_role_unique` UNIQUE(`userId`,`roleId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`accountStatus` enum('pending_verification','verified','rejected','suspended','deactivated') NOT NULL DEFAULT 'pending_verification',
	`emailVerifiedAt` timestamp,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `verificationDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`verificationRequestId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verificationDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verificationRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('submitted','needs_information','approved','rejected') NOT NULL DEFAULT 'submitted',
	`decisionReason` text,
	`reviewedBy` int,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verificationRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `alumniProfiles` ADD CONSTRAINT `alumniProfiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alumniProfiles` ADD CONSTRAINT `alumniProfiles_promotionId_promotions_id_fk` FOREIGN KEY (`promotionId`) REFERENCES `promotions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auditLogs` ADD CONSTRAINT `auditLogs_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connections` ADD CONSTRAINT `connections_userAId_users_id_fk` FOREIGN KEY (`userAId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connections` ADD CONSTRAINT `connections_userBId_users_id_fk` FOREIGN KEY (`userBId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `connections` ADD CONSTRAINT `connections_initiatedById_users_id_fk` FOREIGN KEY (`initiatedById`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversationMembers` ADD CONSTRAINT `conversationMembers_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversationMembers` ADD CONSTRAINT `conversationMembers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messageAttachments` ADD CONSTRAINT `messageAttachments_messageId_messages_id_fk` FOREIGN KEY (`messageId`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userRoles` ADD CONSTRAINT `userRoles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userRoles` ADD CONSTRAINT `userRoles_roleId_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userRoles` ADD CONSTRAINT `userRoles_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verificationDocuments` ADD CONSTRAINT `verificationDocuments_verificationRequestId_verificationRequests_id_fk` FOREIGN KEY (`verificationRequestId`) REFERENCES `verificationRequests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verificationRequests` ADD CONSTRAINT `verificationRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verificationRequests` ADD CONSTRAINT `verificationRequests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `profiles_promotion_idx` ON `alumniProfiles` (`promotionId`);--> statement-breakpoint
CREATE INDEX `profiles_mentor_idx` ON `alumniProfiles` (`mentorAvailable`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `auditLogs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `audit_actor_idx` ON `auditLogs` (`actorId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `connection_recipient_idx` ON `connections` (`userBId`,`status`);--> statement-breakpoint
CREATE INDEX `conversation_member_user_idx` ON `conversationMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `conversation_recent_idx` ON `conversations` (`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `message_attachment_idx` ON `messageAttachments` (`messageId`);--> statement-breakpoint
CREATE INDEX `messages_thread_idx` ON `messages` (`conversationId`,`sentAt`);--> statement-breakpoint
CREATE INDEX `messages_sender_idx` ON `messages` (`senderId`,`sentAt`);--> statement-breakpoint
CREATE INDEX `user_roles_user_idx` ON `userRoles` (`userId`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`accountStatus`);--> statement-breakpoint
CREATE INDEX `verification_queue_idx` ON `verificationRequests` (`status`,`submittedAt`);--> statement-breakpoint
CREATE INDEX `verification_user_idx` ON `verificationRequests` (`userId`);