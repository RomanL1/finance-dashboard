ALTER TABLE `finance_account` ADD `number` integer NOT NULL DEFAULT 0;--> statement-breakpoint
UPDATE `finance_account` SET `number` = (
	SELECT `rn` FROM (
		SELECT `id`, row_number() OVER (PARTITION BY `household_id` ORDER BY `start_date`, `created_at`, `id`) AS `rn`
		FROM `finance_account`
	) AS `numbered`
	WHERE `numbered`.`id` = `finance_account`.`id`
);--> statement-breakpoint
CREATE UNIQUE INDEX `finance_account_household_id_number_idx` ON `finance_account` (`household_id`,`number`);
