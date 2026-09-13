CREATE TABLE `exchange_rate` (
	`base` text NOT NULL,
	`quote` text NOT NULL,
	`date` text NOT NULL,
	`rate` real NOT NULL,
	CONSTRAINT `exchange_rate_pk` PRIMARY KEY(`base`, `quote`, `date`)
);
--> statement-breakpoint
ALTER TABLE `household` ADD `base_currency` text DEFAULT 'CHF' NOT NULL;