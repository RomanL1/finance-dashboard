import type { AccountDto } from '../../core/api';
import {
    settleDefaults,
    toTransferRows,
    type TransferDto,
} from './transfer.types';

const account = (
    id: string,
    number: number,
    overrides: Partial<AccountDto> = {},
): AccountDto => ({
    id,
    householdId: 'h1',
    number,
    description: id,
    type: 'checking',
    currency: 'CHF',
    initialValue: 0,
    amount: 0,
    startDate: '2026-01-01T00:00:00.000Z',
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

const transfer: TransferDto = {
    id: 't1',
    fromAccountId: 'checking',
    toAccountId: 'card',
    amount: 2000,
    title: null,
    date: '2026-02-01T12:00:00.000Z',
    createdAt: '2026-02-01T12:00:00.000Z',
};

describe('toTransferRows', () => {
    it('resolves both accounts to badge number and name', () => {
        const [row] = toTransferRows(
            [transfer],
            [account('checking', 1), account('card', 2)],
            'en',
        );

        expect(row).toMatchObject({
            id: 't1',
            fromNumber: 1,
            fromName: 'checking',
            toNumber: 2,
            toName: 'card',
            currency: 'CHF',
            amount: 2000,
            title: null,
        });
        expect(row.when).toMatch(/^\d{2}\.\d{2}\.26 \d{2}:\d{2}$/);
    });

    it('survives an unknown account', () => {
        const [row] = toTransferRows([transfer], [], 'en');
        expect(row).toMatchObject({ fromNumber: 0, toName: '', currency: '' });
    });
});

describe('settleDefaults', () => {
    it('sends the whole debt to the card and leaves the payer open', () => {
        expect(settleDefaults(account('card', 2, { amount: -12345 }))).toEqual({
            toAccountId: 'card',
            amount: 12345,
        });
    });

    it('never proposes a negative amount', () => {
        expect(settleDefaults(account('card', 2, { amount: 500 })).amount).toBe(
            0,
        );
    });
});
