CREATE TABLE `account` (
	`userId` varchar(36) NOT NULL,
	`type` varchar(255) NOT NULL,
	`provider` varchar(255) NOT NULL,
	`providerAccountId` varchar(255) NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` int,
	`token_type` varchar(255),
	`scope` varchar(255),
	`id_token` text,
	`session_state` varchar(255),
	CONSTRAINT `account_provider_providerAccountId_pk` PRIMARY KEY(`provider`,`providerAccountId`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` varchar(36) NOT NULL,
	`actor_id` varchar(36),
	`action` varchar(64) NOT NULL,
	`target_type` varchar(32) NOT NULL,
	`target_id` varchar(64) NOT NULL,
	`details` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order` (
	`id` varchar(36) NOT NULL,
	`service_id` varchar(36) NOT NULL,
	`buyer_id` varchar(36) NOT NULL,
	`seller_id` varchar(36) NOT NULL,
	`status` enum('requested','accepted','in_progress','delivered','completed','cancelled','disputed') NOT NULL DEFAULT 'requested',
	`brief` text NOT NULL,
	`song_url` varchar(500),
	`price_cents` int NOT NULL,
	`fee_cents` int NOT NULL,
	`delivery_url` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `order_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`service_id` varchar(36) NOT NULL,
	`seller_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`rating` int NOT NULL,
	`body` text NOT NULL,
	`is_hidden` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `review_id` PRIMARY KEY(`id`),
	CONSTRAINT `review_order_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `service` (
	`id` varchar(36) NOT NULL,
	`seller_id` varchar(36) NOT NULL,
	`title` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`mode` enum('osu','taiko','fruits','mania') NOT NULL,
	`price_cents` int NOT NULL,
	`pricing_unit` enum('per_minute','per_difficulty','fixed') NOT NULL,
	`delivery_days` int NOT NULL,
	`status` enum('active','paused','removed') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `service_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`sessionToken` varchar(255) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`expires` timestamp NOT NULL,
	CONSTRAINT `session_sessionToken` PRIMARY KEY(`sessionToken`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255),
	`email` varchar(255),
	`emailVerified` timestamp(3),
	`image` varchar(512),
	`osu_id` int,
	`username` varchar(64),
	`country_code` varchar(2),
	`playmode` enum('osu','taiko','fruits','mania'),
	`global_rank` int,
	`pp` double,
	`ranked_mapsets` int NOT NULL DEFAULT 0,
	`loved_mapsets` int NOT NULL DEFAULT 0,
	`osu_synced_at` timestamp,
	`bio` text,
	`discord_handle` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`is_verified` boolean NOT NULL DEFAULT false,
	`is_banned` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`),
	CONSTRAINT `user_osu_id_unique` UNIQUE(`osu_id`),
	CONSTRAINT `user_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires` timestamp NOT NULL,
	CONSTRAINT `verificationToken_identifier_token_pk` PRIMARY KEY(`identifier`,`token`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actor_id_user_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order` ADD CONSTRAINT `order_service_id_service_id_fk` FOREIGN KEY (`service_id`) REFERENCES `service`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order` ADD CONSTRAINT `order_buyer_id_user_id_fk` FOREIGN KEY (`buyer_id`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order` ADD CONSTRAINT `order_seller_id_user_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `review` ADD CONSTRAINT `review_order_id_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `review` ADD CONSTRAINT `review_service_id_service_id_fk` FOREIGN KEY (`service_id`) REFERENCES `service`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `review` ADD CONSTRAINT `review_seller_id_user_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `review` ADD CONSTRAINT `review_author_id_user_id_fk` FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service` ADD CONSTRAINT `service_seller_id_user_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_userId_user_id_fk` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `order_buyer_idx` ON `order` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `order_seller_idx` ON `order` (`seller_id`);--> statement-breakpoint
CREATE INDEX `order_status_idx` ON `order` (`status`);--> statement-breakpoint
CREATE INDEX `review_seller_idx` ON `review` (`seller_id`);--> statement-breakpoint
CREATE INDEX `service_seller_idx` ON `service` (`seller_id`);--> statement-breakpoint
CREATE INDEX `service_status_idx` ON `service` (`status`);