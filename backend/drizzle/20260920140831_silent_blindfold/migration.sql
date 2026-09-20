CREATE TABLE `budget_month` (
	`household_id` text NOT NULL,
	`month` text NOT NULL,
	CONSTRAINT `budget_month_pk` PRIMARY KEY(`household_id`, `month`),
	CONSTRAINT `fk_budget_month_household_id_household_id_fk` FOREIGN KEY (`household_id`) REFERENCES `household`(`id`) ON DELETE CASCADE
);
