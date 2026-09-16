import { describe, expect, it, vi } from 'vitest';
import {
    NotFoundError,
    UnavailableError,
    ValidationError,
} from '../../../shared/kernel/index.js';
import type { Account, CreateAccount } from '../model/account.js';
import type { AccountRepository } from '../repository/account.repository.js';
import type { HouseholdService } from '../../household/service/household.service.js';
import type { ExchangeRateService } from '../../exchange-rate/service/exchange-rate.service.js';
import type { CurrencyConverter } from '../../exchange-rate/model/exchange-rate.js';
import { AccountService } from './account.service.js';

const dummyAccount: Account = {
    id: 'acc-1',
    householdId: 'household-1',
    number: 1,
    description: 'Checking',
    currency: 'CHF',
    initialValue: 10000,
    amount: 10000,
    startDate: new Date('2026-01-01'),
    archivedAt: null,
    createdAt: new Date('2026-01-01'),
};

const input = {
    description: 'Checking',
    currency: 'CHF',
    initialValue: 1000,
    startDate: new Date('2026-01-01'),
};

function makeRepo(overrides: Partial<AccountRepository> = {}) {
    return {
        listByHouseholdId: vi.fn().mockResolvedValue([dummyAccount]),
        createAccount: vi
            .fn()
            .mockImplementation((entity: CreateAccount, householdId: string) =>
                Promise.resolve({
                    ...entity,
                    amount: entity.initialValue,
                    householdId,
                    number: 1,
                    createdAt: new Date('2026-01-01'),
                }),
            ),
        updateAccount: vi.fn().mockResolvedValue(dummyAccount),
        deleteAccount: vi.fn().mockResolvedValue(true),
        ...overrides,
    } as unknown as AccountRepository;
}

function makeHouseholds(baseCurrency = 'CHF') {
    return {
        getById: vi.fn().mockResolvedValue({ id: 'household-1', baseCurrency }),
    } as unknown as HouseholdService;
}

/** Fixed rates: 1 CHF = 2 EUR, 1 CHF = 4 USD; GBP unknown. */
function makeExchangeRates() {
    const converter: CurrencyConverter = {
        base: 'CHF',
        toBase: (amount, currency) => {
            if (currency === 'CHF') return amount;
            const rate = { EUR: 2, USD: 4 }[currency as string];
            if (!rate) throw new UnavailableError(`No CHF/${currency} rate`);
            return Math.round(amount / rate);
        },
    };
    return {
        latestConverter: vi.fn().mockResolvedValue(converter),
    } as unknown as ExchangeRateService;
}

function makeService(repo: AccountRepository) {
    return new AccountService(repo, makeHouseholds(), makeExchangeRates());
}

const account = (overrides: Partial<Account>): Account => ({
    ...dummyAccount,
    ...overrides,
});

describe('AccountService.getHouseholdBalance', () => {
    it('sums active balances converted into the base currency', async () => {
        const repo = makeRepo({
            listByHouseholdId: vi
                .fn()
                .mockResolvedValue([
                    account({ id: 'a', currency: 'CHF', amount: 1000 }),
                    account({ id: 'b', currency: 'EUR', amount: 500 }),
                    account({ id: 'c', currency: 'USD', amount: -400 }),
                ]),
        });
        await expect(
            makeService(repo).getHouseholdBalance('household-1'),
        ).resolves.toEqual({ currency: 'CHF', amount: 1000 + 250 - 100 });
    });

    it('excludes archived accounts, but not ones archived in the future', async () => {
        const repo = makeRepo({
            listByHouseholdId: vi.fn().mockResolvedValue([
                account({ id: 'a', amount: 1000 }),
                account({
                    id: 'b',
                    amount: 5000,
                    archivedAt: new Date('2020-01-01'),
                }),
                account({
                    id: 'c',
                    amount: 300,
                    archivedAt: new Date('2999-01-01'),
                }),
            ]),
        });
        await expect(
            makeService(repo).getHouseholdBalance('household-1'),
        ).resolves.toEqual({ currency: 'CHF', amount: 1300 });
    });

    it('is zero without accounts', async () => {
        const repo = makeRepo({
            listByHouseholdId: vi.fn().mockResolvedValue([]),
        });
        await expect(
            makeService(repo).getHouseholdBalance('household-1'),
        ).resolves.toEqual({ currency: 'CHF', amount: 0 });
    });

    it('fails when a needed rate is missing', async () => {
        const repo = makeRepo({
            listByHouseholdId: vi
                .fn()
                .mockResolvedValue([
                    account({ id: 'a', currency: 'GBP', amount: 100 }),
                ]),
        });
        await expect(
            makeService(repo).getHouseholdBalance('household-1'),
        ).rejects.toBeInstanceOf(UnavailableError);
    });
});

describe('AccountService', () => {
    describe('getAll', () => {
        it('returns all accounts for a household', async () => {
            const repo = makeRepo();
            const service = makeService(repo);

            const accounts = await service.getAll('household-1');

            expect(accounts).toEqual([dummyAccount]);
            expect(repo.listByHouseholdId).toHaveBeenCalledWith('household-1');
        });
    });

    describe('create', () => {
        it('creates an account with a generated id', async () => {
            const repo = makeRepo();
            const service = makeService(repo);

            const created = await service.create('household-1', {
                description: 'Checking',
                currency: 'USD',
                initialValue: 5000,
                startDate: new Date('2026-01-01'),
            });

            expect(created.description).toBe('Checking');
            expect(created.currency).toBe('USD');
            expect(created.initialValue).toBe(5000);
            expect(created.amount).toBe(5000);
            expect(repo.createAccount).toHaveBeenCalledWith(
                {
                    id: expect.any(String),
                    description: 'Checking',
                    currency: 'USD',
                    initialValue: 5000,
                    startDate: new Date('2026-01-01'),
                    archivedAt: null,
                },
                'household-1',
            );
        });

        it('throws ValidationError when description is empty or whitespace', async () => {
            const service = makeService(makeRepo());

            await expect(
                service.create('household-1', {
                    description: '',
                    currency: 'CHF',
                    initialValue: 1000,
                    startDate: new Date('2026-01-01'),
                }),
            ).rejects.toBeInstanceOf(ValidationError);
            await expect(
                service.create('household-1', {
                    description: '   ',
                    currency: 'CHF',
                    initialValue: 1000,
                    startDate: new Date('2026-01-01'),
                }),
            ).rejects.toBeInstanceOf(ValidationError);
        });
    });

    describe('update', () => {
        it('replaces fields, keeps id and initial value', async () => {
            const repo = makeRepo();
            const service = makeService(repo);
            const archivedAt = new Date('2026-06-01');

            const { initialValue: _fixed, ...editable } = input;
            await service.update('household-1', 'acc-1', {
                ...editable,
                archivedAt,
            });

            expect(repo.updateAccount).toHaveBeenCalledWith('household-1', {
                id: 'acc-1',
                ...editable,
                archivedAt,
            });
        });

        it('throws NotFoundError when the repository returns null', async () => {
            const service = makeService(
                makeRepo({ updateAccount: vi.fn().mockResolvedValue(null) }),
            );

            await expect(
                service.update('household-1', 'missing', input),
            ).rejects.toBeInstanceOf(NotFoundError);
        });
    });

    describe('delete', () => {
        it('deletes an account', async () => {
            const repo = makeRepo();
            await makeService(repo).delete('household-1', 'acc-1');
            expect(repo.deleteAccount).toHaveBeenCalledWith(
                'household-1',
                'acc-1',
            );
        });

        it('throws NotFoundError when nothing was deleted', async () => {
            const service = makeService(
                makeRepo({ deleteAccount: vi.fn().mockResolvedValue(false) }),
            );
            await expect(
                service.delete('household-1', 'missing'),
            ).rejects.toBeInstanceOf(NotFoundError);
        });
    });
});
