import type { AccountDto } from './account.types';
import { canSettle, isActiveAccount } from './account.types';

const account = (archivedAt: string | null): AccountDto => ({
    id: 'acc-1',
    householdId: 'h1',
    number: 1,
    description: 'Checking',
    type: 'checking',
    currency: 'CHF',
    initialValue: 0,
    amount: 0,
    startDate: '2026-01-01T00:00:00.000Z',
    archivedAt,
    createdAt: '2026-01-01T00:00:00.000Z',
});

describe('isActiveAccount', () => {
    const at = new Date('2026-09-15T12:00:00.000Z');

    it('is active without an archive date', () => {
        expect(isActiveAccount(account(null), at)).toBe(true);
    });

    it('is active until a future archive date', () => {
        expect(isActiveAccount(account('2026-09-16T00:00:00.000Z'), at)).toBe(
            true,
        );
    });

    it('is inactive from the archive date on', () => {
        expect(isActiveAccount(account('2026-09-15T12:00:00.000Z'), at)).toBe(
            false,
        );
        expect(isActiveAccount(account('2026-01-01T00:00:00.000Z'), at)).toBe(
            false,
        );
    });
});

describe('canSettle', () => {
    const at = new Date('2026-09-15T12:00:00.000Z');
    const card = (amount: number, archivedAt: string | null = null) => ({
        ...account(archivedAt),
        type: 'credit_card' as const,
        amount,
    });

    it('is true for an active credit card with debt', () => {
        expect(canSettle(card(-100), at)).toBe(true);
    });

    it('is false without debt, for other types, or once archived', () => {
        expect(canSettle(card(0), at)).toBe(false);
        expect(canSettle({ ...account(null), amount: -100 }, at)).toBe(false);
        expect(canSettle(card(-100, '2026-09-01T00:00:00.000Z'), at)).toBe(
            false,
        );
    });
});
