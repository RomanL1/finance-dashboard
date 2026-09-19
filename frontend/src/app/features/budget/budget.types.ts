import { formatDate } from '@angular/common';
import type {
    BudgetDto,
    CategoryDto,
    CategoryStatsDto,
    CopiedBudgetsDto,
} from '../../core/api';

export type { BudgetDto, CopiedBudgetsDto };

/** `YYYY-MM`, the key the API addresses limits by. */
export function toMonthKey(date: Date): string {
    return formatDate(date, 'yyyy-MM', 'en');
}

/**
 * Months that fill themselves from the previous limits on first view (story S4): the current
 * calendar month and the next one, so limits can be planned ahead. Any other month needs an explicit action.
 */
export function isAutoInheritMonth(month: string, now = new Date()): boolean {
    const current = toMonthKey(now);
    const next = toMonthKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    return month === current || month === next;
}

/** The limits of one month plus, when they were just copied, where they came from. */
export interface MonthBudgets {
    budgets: BudgetDto[];
    inheritedFrom: string | null;
}

/** One list row: every household category, with its limit and what was spent against it. */
export interface BudgetRow {
    category: CategoryDto;
    /** Null = no limit. 0 is a deliberate zero limit. */
    amount: number | null;
    /** Expenses of the month in minor units, 0 when there are none. */
    spent: number;
    /** `amount - spent`; negative when over the limit. Null when there is no limit. */
    remaining: number | null;
}

/**
 * Categories keep their server order (by name); limits and expenses attach by category id.
 * Uncategorized expenses have no row: nothing can be budgeted for them.
 */
export function toBudgetRows(
    categories: CategoryDto[],
    budgets: BudgetDto[],
    stats: CategoryStatsDto,
): BudgetRow[] {
    const limits = new Map(budgets.map((b) => [b.categoryId, b.amount]));
    const expenses = new Map(
        stats.categories.map((c) => [c.categoryId, c.expenses]),
    );
    return categories.map((category) => {
        const amount = limits.get(category.id) ?? null;
        const spent = expenses.get(category.id) ?? 0;
        return {
            category,
            amount,
            spent,
            remaining: amount === null ? null : amount - spent,
        };
    });
}

/** Filled share of a limit, clamped to [0, 1]. A zero limit is full as soon as anything is spent. Null without a limit. */
export function budgetRatio(row: BudgetRow): number | null {
    if (row.amount === null) return null;
    if (row.amount === 0) return row.spent > 0 ? 1 : 0;
    return Math.min(row.spent / row.amount, 1);
}

export function isOverBudget(row: BudgetRow): boolean {
    return row.remaining !== null && row.remaining < 0;
}

/** Sums over the budgeted categories only, so `remaining` is honest about the limits that exist. */
export interface BudgetTotals {
    /** Number of categories with a limit. */
    budgeted: number;
    limit: number;
    spent: number;
    remaining: number;
}

export function toBudgetTotals(rows: BudgetRow[]): BudgetTotals {
    const budgeted = rows.filter((r) => r.amount !== null);
    const limit = budgeted.reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const spent = budgeted.reduce((sum, r) => sum + r.spent, 0);
    return {
        budgeted: budgeted.length,
        limit,
        spent,
        remaining: limit - spent,
    };
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
