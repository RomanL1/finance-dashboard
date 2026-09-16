DROP TABLE `exchange_rate`;--> statement-breakpoint
UPDATE `finance_account` SET `currency` = (SELECT `base_currency` FROM `household` WHERE `household`.`id` = `finance_account`.`household_id`);
