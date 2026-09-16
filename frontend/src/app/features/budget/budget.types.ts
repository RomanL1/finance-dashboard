import { formatDate } from '@angular/common';
import type { BudgetDto, CategoryDto } from '../../core/api';

export type { BudgetDto };

/** `YYYY-MM`, the key the API addresses limits by. */
export function toMonthKey(date: Date): string {
    return formatDate(date, 'yyyy-MM', 'en');
}

/** One list row: every household category, with its limit when one is set. */
export interface BudgetRow {
    category: CategoryDto;
    /** Null = no limit. 0 is a deliberate zero limit. */
    amount: number | null;
}

/** Categories keep their server order (by name); limits attach by category id. */
export function toBudgetRows(
    categories: CategoryDto[],
    budgets: BudgetDto[],
): BudgetRow[] {
    const byCategory = new Map(budgets.map((b) => [b.categoryId, b.amount]));
    return categories.map((category) => ({
        category,
        amount: byCategory.get(category.id) ?? null,
    }));
}

/** What the limit dialog needs from its opener. */
export interface BudgetDialogData {
    householdId: string;
    month: string;
    currency: string;
    row: BudgetRow;
}

/** Dialog result: the new amount, or null when the limit was removed. */
export type BudgetDialogResult = { amount: number | null };
