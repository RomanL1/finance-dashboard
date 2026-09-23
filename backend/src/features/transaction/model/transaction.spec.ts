import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../shared/kernel/index.js';
import { assertValidRange, buildTransaction } from './transaction.js';

const input = {
    accountId: 'acc-1',
    type: 'expense' as const,
    amount: 1250,
    date: new Date('2026-01-15'),
};

describe('buildTransaction', () => {
    it('nulls omitted optional fields', () => {
        expect(buildTransaction(input)).toEqual({
            id: expect.any(String),
            accountId: 'acc-1',
            categoryId: null,
            type: 'expense',
            amount: 1250,
            title: null,
            description: null,
            date: input.date,
        });
    });

    it('trims title and description, nulling blank ones', () => {
        const built = buildTransaction({
            ...input,
            categoryId: 'cat-1',
            title: '  Rent ',
            description: '   ',
        });
        expect(built).toMatchObject({
            categoryId: 'cat-1',
            title: 'Rent',
            description: null,
        });
    });

    it('accepts the smallest amount', () => {
        expect(buildTransaction({ ...input, amount: 1 }).amount).toBe(1);
    });

    it.each([0, -5, 1.5, Number.NaN])('rejects the amount %s', (amount) => {
        expect(() => buildTransaction({ ...input, amount })).toThrow(
            ValidationError,
        );
    });
});

describe('assertValidRange', () => {
    const from = new Date('2026-09-01');
    const to = new Date('2026-10-01');

    it('accepts a range whose end is after its start', () => {
        expect(() => assertValidRange({ from, to })).not.toThrow();
    });

    it('rejects an empty or inverted range', () => {
        expect(() => assertValidRange({ from, to: from })).toThrow(
            'Range end must be after its start',
        );
        expect(() => assertValidRange({ from: to, to: from })).toThrow(
            ValidationError,
        );
    });

    it('rejects invalid dates', () => {
        const invalid = new Date('nope');
        expect(() => assertValidRange({ from: invalid, to })).toThrow(
            'Range dates must be valid',
        );
        expect(() => assertValidRange({ from, to: invalid })).toThrow(
            'Range dates must be valid',
        );
    });
});
