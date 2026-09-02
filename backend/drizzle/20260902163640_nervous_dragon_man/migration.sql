CREATE TABLE `category` (
	`id` text PRIMARY KEY,
	`household_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_category_household_id_household_id_fk` FOREIGN KEY (`household_id`) REFERENCES `household`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
ALTER TABLE `household` ADD `updated_at` integer DEFAULT (unixepoch()) NOT NULL;--> statement-breakpoint
ALTER TABLE `household_member` ADD `created_at` integer DEFAULT (unixepoch()) NOT NULL;--> statement-breakpoint
ALTER TABLE `household_member` ADD `updated_at` integer DEFAULT (unixepoch()) NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_household` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`currency` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_household`(`id`, `name`, `currency`, `created_at`) SELECT `id`, `name`, `currency`, `created_at` FROM `household`;--> statement-breakpoint
DROP TABLE `household`;--> statement-breakpoint
ALTER TABLE `__new_household` RENAME TO `household`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `category_household_id_name_idx` ON `category` (`household_id`,`name`);