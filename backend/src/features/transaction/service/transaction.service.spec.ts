import { describe, expect, it, vi } from 'vitest';
import {
    NotFoundError,
    ValidationError,
} from '../../../shared/kernel/index.js';
import type {
    CategoryDayExpense,
    CreateTransaction,
} from '../model/transaction.js';
import type { TransactionRepository } from '../repository/transaction.repository.js';
import type { HouseholdService } from '../../household/service/household.service.js';
import type { ExchangeRateService } from '../../exchange-rate/service/exchange-rate.service.js';
import type { CurrencyConverter } from '../../exchange-rate/model/exchange-rate.js';
import { TransactionService } from './transaction.service.js';

const input = {
    accountId: 'acc-1',
    categoryId: 'cat-1',
    type: 'expense' as const,
    amount: 1250,
    title: ' Groceries ',
    description: '  ',
    date: new Date('2026-01-15'),
};

function makeRepo(overrides: Partial<TransactionRepository> = {}) {
    return {
        listByHouseholdId: vi.fn().mockResolvedValue([]),
        accountExists: vi.fn().mockResolvedValue(true),
        categoryExists: vi.fn().mockResolvedValue(true),
        createTransaction: vi
            .fn()
            .mockImplementation((entity: CreateTransaction) =>
                Promise.resolve({ ...entity, createdAt: new Date() }),
            ),
        updateTransaction: vi
            .fn()
            .mockImplementation((_h: string, entity: CreateTransaction) =>
                Promise.resolve({ ...entity, createdAt: new Date() }),
            ),
        deleteTransaction: vi.fn().mockResolvedValue(true),
        sumByCurrencyAndDay: vi.fn().mockResolvedValue([]),
        sumExpensesByCategoryAndDay: vi.fn().mockResolvedValue([]),
        ...overrides,
    } as unknown as TransactionRepository;
}

function makeHouseholds(baseCurrency = 'CHF') {
    return {
        getById: vi.fn().mockResolvedValue({ id: 'h-1', baseCurrency }),
    } as unknown as HouseholdService;
}

/** Fixed rates: 1 CHF = 2 EUR, 1 CHF = 4 USD. */
function makeExchangeRates() {
    const converter: CurrencyConverter = {
        base: 'CHF',
        toBase: (amount, currency) =>
            currency === 'CHF'
                ? amount
                : Math.round(amount / { EUR: 2, USD: 4, GBP: 1 }[currency]),
    };
    return {
        converter: vi.fn().mockResolvedValue(converter),
    } as unknown as ExchangeRateService;
}

function makeService(repo: TransactionRepository) {
    return new TransactionService(repo, makeHouseholds(), makeExchangeRates());
}

describe('TransactionService.create', () => {
    it('trims title, nulls blank description, persists', async () => {
        const repo = makeRepo();
        const created = await makeService(repo).create('h-1', input);

        expect(created.title).toBe('Groceries');
        expect(created.description).toBeNull();
        expect(repo.accountExists).toHaveBeenCalledWith('h-1', 'acc-1');
        expect(repo.categoryExists).toHaveBeenCalledWith('h-1', 'cat-1');
        expect(repo.createTransaction).toHaveBeenCalledWith(
            expect.objectContaining({ id: expect.any(String), amount: 1250 }),
        );
    });

    it('nulls a blank title and skips the category check when none is given', async () => {
        const repo = makeRepo();
        const created = await makeService(repo).create('h-1', {
            ...input,
            title: ' ',
            categoryId: null,
        });

        expect(created.title).toBeNull();
        expect(created.categoryId).toBeNull();
        expect(repo.categoryExists).not.toHaveBeenCalled();
    });

    it('rejects non-positive amount', async () => {
        const service = makeService(makeRepo());
        await expect(
            service.create('h-1', { ...input, amount: 0 }),
        ).rejects.toBeInstanceOf(ValidationError);
        await expect(
            service.create('h-1', { ...input, amount: 1.5 }),
        ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws NotFound when account or category is not in the household', async () => {
        const noAccount = makeRepo({
            accountExists: vi.fn().mockResolvedValue(false),
        });
        await expect(
            makeService(noAccount).create('h-1', input),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect(noAccount.createTransaction).not.toHaveBeenCalled();

        const noCategory = makeRepo({
            categoryExists: vi.fn().mockResolvedValue(false),
        });
        await expect(
            makeService(noCategory).create('h-1', input),
        ).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('TransactionService.update', () => {
    it('keeps the id, validates references, replaces every field', async () => {
        const repo = makeRepo();
        const updated = await makeService(repo).update('h-1', 'tx-1', input);

        expect(updated.id).toBe('tx-1');
        expect(updated.title).toBe('Groceries');
        expect(repo.accountExists).toHaveBeenCalledWith('h-1', 'acc-1');
        expect(repo.updateTransaction).toHaveBeenCalledWith(
            'h-1',
            expect.objectContaining({ id: 'tx-1', amount: 1250 }),
        );
    });

    it('throws NotFound when the row is outside the household', async () => {
        const repo = makeRepo({
            updateTransaction: vi.fn().mockResolvedValue(null),
        });
        await expect(
            makeService(repo).update('h-1', 'tx-1', input),
        ).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('TransactionService.delete', () => {
    it('throws NotFound when nothing was deleted', async () => {
        const repo = makeRepo({
            deleteTransaction: vi.fn().mockResolvedValue(false),
        });
        await expect(
            makeService(repo).delete('h-1', 'tx-1'),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect(repo.deleteTransaction).toHaveBeenCalledWith('h-1', 'tx-1');
    });
});

describe('TransactionService.getStats', () => {
    it('converts each day into the base currency and sums', async () => {
        const repo = makeRepo({
            sumByCurrencyAndDay: vi.fn().mockResolvedValue([
                {
                    currency: 'CHF',
                    day: '2026-09-01',
                    income: 100,
                    expenses: 40,
                },
                {
                    currency: 'EUR',
                    day: '2026-09-02',
                    income: 200,
                    expenses: 80,
                },
                {
                    currency: 'USD',
                    day: '2026-09-03',
                    income: 0,
                    expenses: 400,
                },
            ]),
        });
        const range = {
            from: new Date('2026-09-01'),
            to: new Date('2026-10-01'),
        };

        const stats = await makeService(repo).getStats('h-1', range);

        // 1 CHF = 2 EUR = 4 USD → EUR 200/80 → 100/40, USD 400 → 100
        expect(stats).toEqual({
            currency: 'CHF',
            income: 200,
            expenses: 180,
            net: 20,
        });
        expect(repo.sumByCurrencyAndDay).toHaveBeenCalledWith('h-1', range);
    });

    it('is all zeros for an empty range', async () => {
        await expect(
            makeService(makeRepo()).getStats('h-1', {
                from: new Date('2026-09-01'),
                to: new Date('2026-10-01'),
            }),
        ).resolves.toEqual({ currency: 'CHF', income: 0, expenses: 0, net: 0 });
    });

    it('rejects an empty or inverted range', async () => {
        const service = makeService(makeRepo());
        const day = new Date('2026-09-01');
        await expect(
            service.getStats('h-1', { from: day, to: day }),
        ).rejects.toBeInstanceOf(ValidationError);
        await expect(
            service.getStats('h-1', {
                from: new Date('2026-10-01'),
                to: day,
            }),
        ).rejects.toBeInstanceOf(ValidationError);
    });
});

describe('TransactionService.getCategoryStats', () => {
    const range = { from: new Date('2026-09-01'), to: new Date('2026-10-01') };
    const rows: CategoryDayExpense[] = [
        {
            currency: 'CHF',
            categoryId: 'c1',
            categoryName: 'Food',
            day: '2026-09-01',
            expenses: 1000,
        },
        {
            currency: 'EUR',
            categoryId: 'c1',
            categoryName: 'Food',
            day: '2026-09-02',
            expenses: 2000,
        },
        {
            currency: 'USD',
            categoryId: null,
            categoryName: null,
            day: '2026-09-03',
            expenses: 4000,
        },
        {
            currency: 'CHF',
            categoryId: 'c2',
            categoryName: 'Rent',
            day: '2026-09-04',
            expenses: 5000,
        },
    ];

    it('converts every day into the base currency, merges per category and sorts descending', async () => {
        const repo = makeRepo({
            sumExpensesByCategoryAndDay: vi.fn().mockResolvedValue(rows),
        });
        const exchangeRates = makeExchangeRates();
        const service = new TransactionService(
            repo,
            makeHouseholds(),
            exchangeRates,
        );

        await expect(service.getCategoryStats('h-1', range)).resolves.toEqual({
            currency: 'CHF',
            categories: [
                { categoryId: 'c2', categoryName: 'Rent', expenses: 5000 },
                { categoryId: 'c1', categoryName: 'Food', expenses: 2000 },
                { categoryId: null, categoryName: null, expenses: 1000 },
            ],
        });
        expect(exchangeRates.converter).toHaveBeenCalledWith(
            'CHF',
            range.from,
            range.to,
        );
    });

    it('returns no categories for an empty range', async () => {
        await expect(
            makeService(makeRepo()).getCategoryStats('h-1', range),
        ).resolves.toEqual({
            currency: 'CHF',
            categories: [],
        });
    });

    it('rejects an inverted range', async () => {
        await expect(
            makeService(makeRepo()).getCategoryStats('h-1', {
                from: range.to,
                to: range.from,
            }),
        ).rejects.toBeInstanceOf(ValidationError);
    });
});
