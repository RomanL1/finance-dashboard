CREATE TABLE `transaction` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`category_id` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`date` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_transaction_account_id_finance_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `finance_account`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_transaction_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX `transaction_account_id_date_idx` ON `transaction` (`account_id`,`date`);