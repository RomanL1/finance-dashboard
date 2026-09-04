PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transaction` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`category_id` text,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`title` text,
	`description` text,
	`date` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_transaction_account_id_finance_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `finance_account`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_transaction_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
INSERT INTO `__new_transaction`(`id`, `account_id`, `category_id`, `type`, `amount`, `title`, `description`, `date`, `created_at`, `updated_at`) SELECT `id`, `account_id`, `category_id`, `type`, `amount`, `title`, `description`, `date`, `created_at`, `updated_at` FROM `transaction`;--> statement-breakpoint
DROP TABLE `transaction`;--> statement-breakpoint
ALTER TABLE `__new_transaction` RENAME TO `transaction`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `transaction_account_id_date_idx` ON `transaction` (`account_id`,`date`);--> statement-breakpoint
ALTER TABLE `household` DROP COLUMN `currency`;