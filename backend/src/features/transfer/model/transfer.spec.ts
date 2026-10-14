import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../shared/kernel/index.js';
import { buildTransfer, isActiveAt } from './transfer.js';

const input = {
    fromAccountId: 'acc-1',
    toAccountId: 'acc-2',
    amount: 50000,
    date: new Date('2026-01-15'),
};

describe('buildTransfer', () => {
    it('nulls an omitted title', () => {
        expect(buildTransfer(input)).toEqual({
            id: expect.any(String),
            fromAccountId: 'acc-1',
            toAccountId: 'acc-2',
            amount: 50000,
            title: null,
            date: input.date,
        });
    });

    it('trims the title, nulling a blank one', () => {
        expect(buildTransfer({ ...input, title: ' Card ' }).title).toBe('Card');
        expect(buildTransfer({ ...input, title: '  ' }).title).toBeNull();
    });

    it('rejects a non-positive or fractional amount', () => {
        expect(() => buildTransfer({ ...input, amount: 0 })).toThrow(
            ValidationError,
        );
        expect(() => buildTransfer({ ...input, amount: 1.5 })).toThrow(
            ValidationError,
        );
    });

    it('rejects the same account on both sides', () => {
        expect(() => buildTransfer({ ...input, toAccountId: 'acc-1' })).toThrow(
            ValidationError,
        );
    });
});

describe('isActiveAt', () => {
    const date = new Date('2026-03-01T12:00:00.000Z');

    it('is active when never archived or archived later', () => {
        expect(isActiveAt({ id: 'a', archivedAt: null }, date)).toBe(true);
        expect(
            isActiveAt(
                { id: 'a', archivedAt: new Date('2026-03-02T00:00:00.000Z') },
                date,
            ),
        ).toBe(true);
    });

    it('is inactive from the archive date on', () => {
        expect(isActiveAt({ id: 'a', archivedAt: date }, date)).toBe(false);
        expect(
            isActiveAt(
                { id: 'a', archivedAt: new Date('2026-02-01T00:00:00.000Z') },
                date,
            ),
        ).toBe(false);
    });
});
