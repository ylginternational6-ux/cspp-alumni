ALTER TABLE `alumniProfiles` ADD `coverStorageKey` varchar(512);--> statement-breakpoint
ALTER TABLE `conversations` ADD `promotionId` int;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversation_promotion_unique` UNIQUE(`promotionId`);--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_promotionId_promotions_id_fk` FOREIGN KEY (`promotionId`) REFERENCES `promotions`(`id`) ON DELETE no action ON UPDATE no action;