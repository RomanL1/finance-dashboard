import { describe, expect, it } from 'vitest';
import {
    budgetRatio,
    isAutoInheritMonth,
    isLowBudget,
    isOverBudget,
    isUsedUp,
    toBudgetRows,
    toBudgetTotals,
    toMonthKey,
    toSafeToSpend,
    toSafeToSpendShares,
    type BudgetRow,
} from './budget.types';

describe('toMonthKey', () => {
    it('zero-pads the month', () => {
        expect(toMonthKey(new Date(2026, 0, 15))).toBe('2026-01');
        expect(toMonthKey(new Date(2026, 11, 31))).toBe('2026-12');
    });
});

describe('isAutoInheritMonth', () => {
    const now = new Date(2026, 8, 16);

    it('is true for the current and the next month', () => {
        expect(isAutoInheritMonth('2026-09', now)).toBe(true);
        expect(isAutoInheritMonth('2026-10', now)).toBe(true);
    });

    it('is false for past months and months further ahead', () => {
        expect(isAutoInheritMonth('2026-08', now)).toBe(false);
        expect(isAutoInheritMonth('2026-11', now)).toBe(false);
    });

    it('rolls over the year', () => {
        expect(isAutoInheritMonth('2027-01', new Date(2026, 11, 3))).toBe(true);
    });
});

const categories = [
    { id: 'a', name: 'A', createdAt: '', transactionCount: 0 },
    { id: 'b', name: 'B', createdAt: '', transactionCount: 0 },
];
const noStats = { currency: 'CHF', categories: [] };

describe('toBudgetRows', () => {
    it('attaches limits by category and keeps the category order', () => {
        const rows = toBudgetRows(
            categories,
            [{ id: 'x', categoryId: 'b', month: '2026-09', amount: 0 }],
            noStats,
        );
        expect(rows).toEqual([
            {
                category: categories[0],
                amount: null,
                spent: 0,
                remaining: null,
            },
            { category: categories[1], amount: 0, spent: 0, remaining: 0 },
        ]);
    });

    it('ignores limits of unknown categories', () => {
        const rows = toBudgetRows(
            categories,
            [{ id: 'x', categoryId: 'gone', month: '2026-09', amount: 100 }],
            noStats,
        );
        expect(rows.every((r) => r.amount === null)).toBe(true);
    });

    it('derives spent and remaining from the expenses, dropping uncategorized ones', () => {
        const rows = toBudgetRows(
            categories,
            [{ id: 'x', categoryId: 'a', month: '2026-09', amount: 500 }],
            {
                currency: 'CHF',
                categories: [
                    { categoryId: 'a', categoryName: 'A', expenses: 700 },
                    { categoryId: 'b', categoryName: 'B', expenses: 100 },
                    { categoryId: null, categoryName: null, expenses: 999 },
                ],
            },
        );
        expect(rows).toEqual([
            {
                category: categories[0],
                amount: 500,
                spent: 700,
                remaining: -200,
            },
            {
                category: categories[1],
                amount: null,
                spent: 100,
                remaining: null,
            },
        ]);
    });
});

function row(amount: number | null, spent: number): BudgetRow {
    return {
        category: categories[0],
        amount,
        spent,
        remaining: amount === null ? null : amount - spent,
    };
}

describe('budgetRatio', () => {
    it('is null without a limit', () => {
        expect(budgetRatio(row(null, 100))).toBeNull();
    });

    it('is the spent share, clamped at 1', () => {
        expect(budgetRatio(row(400, 100))).toBe(0.25);
        expect(budgetRatio(row(400, 400))).toBe(1);
        expect(budgetRatio(row(400, 900))).toBe(1);
    });

    it('treats a zero limit as full once anything is spent', () => {
        expect(budgetRatio(row(0, 0))).toBe(0);
        expect(budgetRatio(row(0, 1))).toBe(1);
    });
});

describe('isOverBudget', () => {
    it('is true only when remaining is negative', () => {
        expect(isOverBudget(row(null, 100))).toBe(false);
        expect(isOverBudget(row(100, 100))).toBe(false);
        expect(isOverBudget(row(100, 101))).toBe(true);
        expect(isOverBudget(row(0, 1))).toBe(true);
    });
});

describe('isLowBudget', () => {
    it('is true while less than 20% but more than nothing is left', () => {
        expect(isLowBudget(row(1000, 801))).toBe(true);
        expect(isLowBudget(row(1000, 999))).toBe(true);
    });

    it('is false once the limit is met exactly', () => {
        expect(isLowBudget(row(1000, 1000))).toBe(false);
    });

    it('is false with 20% or more left, when exceeded, or without a usable limit', () => {
        expect(isLowBudget(row(1000, 800))).toBe(false);
        expect(isLowBudget(row(1000, 1001))).toBe(false);
        expect(isLowBudget(row(null, 100))).toBe(false);
        expect(isLowBudget(row(0, 0))).toBe(false);
    });
});

describe('isUsedUp', () => {
    it('is true only when the limit is met to the cent', () => {
        expect(isUsedUp(row(1000, 1000))).toBe(true);
        expect(isUsedUp(row(1000, 999))).toBe(false);
        expect(isUsedUp(row(1000, 1001))).toBe(false);
    });

    it('ignores rows without a usable limit', () => {
        expect(isUsedUp(row(null, 0))).toBe(false);
        expect(isUsedUp(row(0, 0))).toBe(false);
    });
});

describe('toSafeToSpend', () => {
    const stats = { currency: 'CHF', income: 5000, expenses: 1800, net: 3200 };

    it('subtracts expenses and what the limits still hold', () => {
        const result = toSafeToSpend(stats, [row(1000, 400), row(null, 900)]);
        expect(result).toEqual({
            income: 5000,
            expenses: 1800,
            reserved: 600,
            amount: 2600,
        });
    });

    it('reserves nothing for an exceeded limit', () => {
        expect(toSafeToSpend(stats, [row(100, 500)]).reserved).toBe(0);
    });

    it('goes negative when more is committed than came in', () => {
        const broke = { ...stats, income: 0 };
        expect(toSafeToSpend(broke, [row(1000, 0)]).amount).toBe(-2800);
    });
});

describe('toSafeToSpendShares', () => {
    const value = (income: number, expenses: number, reserved: number) => ({
        income,
        expenses,
        reserved,
        amount: income - expenses - reserved,
    });

    it('splits the income into spent, held by budgets and free', () => {
        expect(toSafeToSpendShares(value(1000, 500, 100))).toEqual({
            expenses: 0.5,
            reserved: 0.1,
            free: 0.4,
        });
    });

    it('spans the commitments when they exceed the income', () => {
        expect(toSafeToSpendShares(value(100, 300, 100))).toEqual({
            expenses: 0.75,
            reserved: 0.25,
            free: 0,
        });
    });

    it('is empty when nothing happened', () => {
        expect(toSafeToSpendShares(value(0, 0, 0))).toEqual({
            expenses: 0,
            reserved: 0,
            free: 0,
        });
    });
});

describe('toBudgetTotals', () => {
    it('sums only budgeted categories', () => {
        expect(
            toBudgetTotals([row(500, 700), row(null, 100), row(300, 50)]),
        ).toEqual({ budgeted: 2, limit: 800, spent: 750, remaining: 50 });
    });

    it('is empty without limits', () => {
        expect(toBudgetTotals([row(null, 100)])).toEqual({
            budgeted: 0,
            limit: 0,
            spent: 0,
            remaining: 0,
        });
    });
});
