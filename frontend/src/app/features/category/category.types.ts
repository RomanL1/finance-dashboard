import type { CategoryDto, CreateCategoryDto } from '../../core/api';

export type { CategoryDto, CreateCategoryDto };

/** What the category dialog needs from its opener. `category` set = rename mode. */
export interface CategoryDialogData {
    householdId: string;
    category?: CategoryDto;
}

/** Delete dialog input: the category to delete and the possible transfer targets. */
export interface CategoryDeleteDialogData {
    category: CategoryDto;
    others: CategoryDto[];
}

/** Delete dialog result. `transferTo` null = uncategorize the transactions. */
export interface CategoryDeleteChoice {
    transferTo: string | null;
}
