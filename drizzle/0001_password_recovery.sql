CREATE TABLE `user_recovery` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text,
	`token_hash` text,
	`expires_at` text,
	`claim_id` text,
	`version` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_recovery_email_unique` ON `user_recovery` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_recovery_token_hash_unique` ON `user_recovery` (`token_hash`);