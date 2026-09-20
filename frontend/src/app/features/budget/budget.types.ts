import { formatDate } from '@angular/common';
import type {
    BudgetDto,
    CategoryDto,
    CategoryStatsDto,
    CopiedBudgetsDto,
    CurrencyStatsDto,
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

/** Below this share of the limit left, a row warns before it is exceeded. */
export const LOW_BUDGET_SHARE = 0.2;

/** Less than 20% of the limit is left, but something still is. A zero limit has nothing to run low on. */
export function isLowBudget(row: BudgetRow): boolean {
    if (row.amount === null || row.remaining === null || row.amount === 0) {
        return false;
    }
    return row.remaining > 0 && row.remaining < row.amount * LOW_BUDGET_SHARE;
}

/** The limit is met to the cent. A zero limit with nothing spent is not used up, it was never there to use. */
export function isUsedUp(row: BudgetRow): boolean {
    return row.amount !== null && row.amount > 0 && row.remaining === 0;
}

/**
 * What can still be spent this month without touching money a limit has set aside:
 * `income - expenses - reserved`. An exceeded limit reserves nothing; its excess is already in the expenses,
 * as is spending without a limit or category. Negative when more is committed than came in.
 */
export interface SafeToSpend {
    income: number;
    expenses: number;
    /** Sum of what is left in every limit that is not exceeded. */
    reserved: number;
    amount: number;
}

export function toSafeToSpend(
    stats: CurrencyStatsDto,
    rows: BudgetRow[],
): SafeToSpend {
    const reserved = rows.reduce(
        (sum, r) => sum + Math.max(r.remaining ?? 0, 0),
        0,
    );
    return {
        income: stats.income,
        expenses: stats.expenses,
        reserved,
        amount: stats.income - stats.expenses - reserved,
    };
}

/** Bar segments of the safe-to-spend card as shares of [0, 1] that sum to at most 1. */
export interface SafeToSpendShares {
    expenses: number;
    reserved: number;
    free: number;
}

/**
 * The bar spans the income. When more is committed than came in, it spans the commitments instead,
 * so expenses and budgets fill it and nothing is free. All zero when there is nothing to show.
 */
export function toSafeToSpendShares(value: SafeToSpend): SafeToSpendShares {
    const committed = value.expenses + value.reserved;
    const base = Math.max(value.income, committed);
    if (base <= 0) return { expenses: 0, reserved: 0, free: 0 };
    return {
        expenses: value.expenses / base,
        reserved: value.reserved / base,
        free: (base - committed) / base,
    };
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
