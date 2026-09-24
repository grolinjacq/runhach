CREATE TABLE `run_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`distance_m` integer NOT NULL,
	`duration_s` integer NOT NULL,
	`xp` integer NOT NULL,
	`best_item_name` text,
	`best_item_rarity` text,
	`best_item_slot` text,
	`best_item_base` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `run_activity_user_id_idx` ON `run_activity` (`user_id`);