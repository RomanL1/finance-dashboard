CREATE TABLE `recurring_transaction` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`category_id` text,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`title` text,
	`description` text,
	`interval` text NOT NULL,
	`weekday` integer,
	`day_of_month` integer,
	`start_date` text NOT NULL,
	`varying_amount` integer DEFAULT false NOT NULL,
	`weekend_shift` integer DEFAULT false NOT NULL,
	`paused` integer DEFAULT false NOT NULL,
	`next_occurrence` text NOT NULL,
	`next_due_date` text NOT NULL,
	`last_occurrence` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_recurring_transaction_account_id_finance_account_id_fk` FOREIGN KEY (`account_id`) REFERENCES `finance_account`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_recurring_transaction_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
ALTER TABLE `household` ADD `time_zone` text DEFAULT 'Europe/Zurich' NOT NULL;--> statement-breakpoint
ALTER TABLE `transaction` ADD `recurring_transaction_id` text REFERENCES recurring_transaction(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `transaction` ADD `needs_confirmation` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `transaction_recurring_transaction_id_idx` ON `transaction` (`recurring_transaction_id`);--> statement-breakpoint
CREATE INDEX `recurring_transaction_account_id_idx` ON `recurring_transaction` (`account_id`);--> statement-breakpoint
CREATE INDEX `recurring_transaction_next_due_date_idx` ON `recurring_transaction` (`next_due_date`);