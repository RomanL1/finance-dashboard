import { describe, expect, it } from 'vitest';
import type { Account } from '../model/account.js';
import { AccountDto } from '../model/account.dto.js';
import { toAccountDto, toAccountsDto } from './account.mapper.js';

const account: Account = {
    id: 'acc-1',
    householdId: 'h-1',
    number: 2,
    description: 'Checking',
    type: 'checking',
    currency: 'CHF',
    initialValue: 1000,
    amount: 1500,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    archivedAt: null,
    createdAt: new Date('2026-01-02T10:00:00.000Z'),
};

describe('toAccountDto', () => {
    it('copies every field and serializes dates as ISO strings', () => {
        const dto = toAccountDto(account);

        expect(dto).toBeInstanceOf(AccountDto);
        expect({ ...dto }).toEqual({
            id: 'acc-1',
            householdId: 'h-1',
            number: 2,
            description: 'Checking',
            type: 'checking',
            currency: 'CHF',
            initialValue: 1000,
            amount: 1500,
            startDate: '2026-01-01T00:00:00.000Z',
            archivedAt: null,
            createdAt: '2026-01-02T10:00:00.000Z',
        });
    });

    it('serializes an archive date', () => {
        expect(
            toAccountDto({
                ...account,
                archivedAt: new Date('2026-06-01T00:00:00.000Z'),
            }).archivedAt,
        ).toBe('2026-06-01T00:00:00.000Z');
    });

    it('maps lists in order', () => {
        expect(
            toAccountsDto([account, { ...account, id: 'acc-2' }]).map(
                (a) => a.id,
            ),
        ).toEqual(['acc-1', 'acc-2']);
    });
});
