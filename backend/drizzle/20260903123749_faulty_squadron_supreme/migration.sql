CREATE TABLE `finance_account` (
	`id` text PRIMARY KEY,
	`household_id` text NOT NULL,
	`description` text NOT NULL,
	`currency` text NOT NULL,
	`initial_value` integer NOT NULL,
	`amount` integer NOT NULL,
	`start_date` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_finance_account_household_id_household_id_fk` FOREIGN KEY (`household_id`) REFERENCES `household`(`id`) ON DELETE CASCADE
);
