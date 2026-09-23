import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../shared/kernel/index.js';
import { assertValidMonth, buildBudget, copyBudgets } from './budget.js';

describe('assertValidMonth', () => {
    it.each(['2026-01', '2026-09', '2026-12', '0001-01'])(
        'accepts %s',
        (month) => {
            expect(() => assertValidMonth(month)).not.toThrow();
        },
    );

    it.each(['2026-00', '2026-13', '2026-9', '26-09', '2026-09-01', ''])(
        'rejects %j',
        (month) => {
            expect(() => assertValidMonth(month)).toThrow(ValidationError);
        },
    );
});

describe('buildBudget', () => {
    it('accepts a zero limit', () => {
        expect(
            buildBudget({ categoryId: 'cat-1', month: '2026-09', amount: 0 }),
        ).toEqual({
            id: expect.any(String),
            categoryId: 'cat-1',
            month: '2026-09',
            amount: 0,
        });
    });

    it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
        'rejects the amount %s',
        (amount) => {
            expect(() =>
                buildBudget({ categoryId: 'cat-1', month: '2026-09', amount }),
            ).toThrow(ValidationError);
        },
    );

    it('rejects a malformed month', () => {
        expect(() =>
            buildBudget({ categoryId: 'cat-1', month: '2026-9', amount: 1 }),
        ).toThrow(ValidationError);
    });
});

describe('copyBudgets', () => {
    it('makes new rows in the target month with the source amounts', () => {
        const source = [
            { id: 'b-1', categoryId: 'cat-1', month: '2026-08', amount: 500 },
            { id: 'b-2', categoryId: 'cat-2', month: '2026-08', amount: 0 },
        ];

        const copies = copyBudgets(source, '2026-10');

        expect(copies).toEqual([
            {
                id: expect.any(String),
                categoryId: 'cat-1',
                month: '2026-10',
                amount: 500,
            },
            {
                id: expect.any(String),
                categoryId: 'cat-2',
                month: '2026-10',
                amount: 0,
            },
        ]);
        expect(copies.map((b) => b.id)).not.toContain('b-1');
        expect(copies.map((b) => b.id)).not.toContain('b-2');
        expect(source[0].month).toBe('2026-08');
    });

    it('is empty for an empty source', () => {
        expect(copyBudgets([], '2026-10')).toEqual([]);
    });
});
