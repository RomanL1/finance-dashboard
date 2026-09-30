CREATE TABLE `household_invitation` (
	`id` text PRIMARY KEY,
	`household_id` text NOT NULL,
	`token_hash` text NOT NULL UNIQUE,
	`note` text,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_household_invitation_household_id_household_id_fk` FOREIGN KEY (`household_id`) REFERENCES `household`(`id`) ON DELETE CASCADE
);
