import { describe, expect, it } from 'vitest';
import {
    budgetRatio,
    isAutoInheritMonth,
    isOverBudget,
    toBudgetRows,
    toBudgetTotals,
    toMonthKey,
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
