CREATE TABLE `budget` (
	`id` text PRIMARY KEY,
	`category_id` text NOT NULL,
	`month` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_budget_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_category_id_month_idx` ON `budget` (`category_id`,`month`);