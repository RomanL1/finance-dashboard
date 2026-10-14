CREATE TABLE `transfer` (
	`id` text PRIMARY KEY,
	`from_account_id` text NOT NULL,
	`to_account_id` text NOT NULL,
	`amount` integer NOT NULL,
	`title` text,
	`date` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_transfer_from_account_id_finance_account_id_fk` FOREIGN KEY (`from_account_id`) REFERENCES `finance_account`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_transfer_to_account_id_finance_account_id_fk` FOREIGN KEY (`to_account_id`) REFERENCES `finance_account`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX `transfer_from_account_id_date_idx` ON `transfer` (`from_account_id`,`date`);--> statement-breakpoint
CREATE INDEX `transfer_to_account_id_date_idx` ON `transfer` (`to_account_id`,`date`);