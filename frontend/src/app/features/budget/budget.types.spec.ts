import { describe, expect, it } from 'vitest';
import { toBudgetRows, toMonthKey } from './budget.types';

describe('toMonthKey', () => {
    it('zero-pads the month', () => {
        expect(toMonthKey(new Date(2026, 0, 15))).toBe('2026-01');
        expect(toMonthKey(new Date(2026, 11, 31))).toBe('2026-12');
    });
});

describe('toBudgetRows', () => {
    const categories = [
        { id: 'a', name: 'A', createdAt: '', transactionCount: 0 },
        { id: 'b', name: 'B', createdAt: '', transactionCount: 0 },
    ];

    it('attaches limits by category and keeps the category order', () => {
        const rows = toBudgetRows(categories, [
            { id: 'x', categoryId: 'b', month: '2026-09', amount: 0 },
        ]);
        expect(rows).toEqual([
            { category: categories[0], amount: null },
            { category: categories[1], amount: 0 },
        ]);
    });

    it('ignores limits of unknown categories', () => {
        const rows = toBudgetRows(categories, [
            { id: 'x', categoryId: 'gone', month: '2026-09', amount: 100 },
        ]);
        expect(rows.every((r) => r.amount === null)).toBe(true);
    });
});
