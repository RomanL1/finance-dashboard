import { describe, expect, it, vi } from 'vitest';
import {
    NotFoundError,
    ValidationError,
} from '../../../shared/kernel/index.js';
import { makeHousehold } from '../../../../test/fixtures/household.js';
import type { CategoryExpense } from '../model/transaction.js';
import type { TransactionRepository } from '../repository/transaction.repository.js';
import type { HouseholdService } from '../../household/service/household.service.js';
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

type RepoFake = Pick<
    TransactionRepository,
    | 'listByHouseholdId'
    | 'countByHouseholdId'
    | 'accountExists'
    | 'categoryExists'
    | 'createTransaction'
    | 'updateTransaction'
    | 'deleteTransaction'
    | 'sumByRange'
    | 'sumExpensesByCategory'
>;

function makeRepo(overrides: Partial<RepoFake> = {}): RepoFake {
    return {
        listByHouseholdId: vi
            .fn<RepoFake['listByHouseholdId']>()
            .mockResolvedValue([]),
        countByHouseholdId: vi
            .fn<RepoFake['countByHouseholdId']>()
            .mockResolvedValue(0),
        accountExists: vi
            .fn<RepoFake['accountExists']>()
            .mockResolvedValue(true),
        categoryExists: vi
            .fn<RepoFake['categoryExists']>()
            .mockResolvedValue(true),
        createTransaction: vi.fn<RepoFake['createTransaction']>((entity) =>
            Promise.resolve({ ...entity, createdAt: new Date() }),
        ),
        updateTransaction: vi.fn<RepoFake['updateTransaction']>((_h, entity) =>
            Promise.resolve({ ...entity, createdAt: new Date() }),
        ),
        deleteTransaction: vi
            .fn<RepoFake['deleteTransaction']>()
            .mockResolvedValue(true),
        sumByRange: vi
            .fn<RepoFake['sumByRange']>()
            .mockResolvedValue({ income: 0, expenses: 0 }),
        sumExpensesByCategory: vi
            .fn<RepoFake['sumExpensesByCategory']>()
            .mockResolvedValue([]),
        ...overrides,
    };
}

function makeHouseholds(): Pick<HouseholdService, 'getById'> {
    return {
        getById: vi
            .fn<HouseholdService['getById']>()
            .mockResolvedValue(makeHousehold('CHF', 'h-1')),
    };
}

function makeService(repo: RepoFake) {
    return new TransactionService(
        repo as TransactionRepository,
        makeHouseholds() as HouseholdService,
    );
}

describe('TransactionService.getPage', () => {
    it('offsets by page and reports total with fixed page size', async () => {
        const repo = makeRepo({
            listByHouseholdId: vi.fn().mockResolvedValue([{ id: 't-1' }]),
            countByHouseholdId: vi.fn().mockResolvedValue(120),
        });
        const filter = { accountId: 'acc-1', categoryId: null };

        const page = await makeService(repo).getPage('h-1', filter, 3);

        expect(repo.listByHouseholdId).toHaveBeenCalledWith(
            'h-1',
            filter,
            50,
            100,
        );
        expect(repo.countByHouseholdId).toHaveBeenCalledWith('h-1', filter);
        expect(page).toEqual({
            items: [{ id: 't-1' }],
            total: 120,
            page: 3,
            pageSize: 50,
        });
    });

    it('starts the first page at offset zero', async () => {
        const repo = makeRepo();
        await makeService(repo).getPage('h-1', {}, 1);
        expect(repo.listByHouseholdId).toHaveBeenCalledWith('h-1', {}, 50, 0);
    });

    it('honours an explicit page size', async () => {
        const repo = makeRepo();
        await makeService(repo).getPage('h-1', {}, 2, 10);
        expect(repo.listByHouseholdId).toHaveBeenCalledWith('h-1', {}, 10, 10);
    });
});

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
        expect(noCategory.createTransaction).not.toHaveBeenCalled();
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

    it('refuses to move the row to an account or category outside the household', async () => {
        const noAccount = makeRepo({
            accountExists: vi.fn().mockResolvedValue(false),
        });
        await expect(
            makeService(noAccount).update('h-1', 'tx-1', input),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect(noAccount.updateTransaction).not.toHaveBeenCalled();

        const noCategory = makeRepo({
            categoryExists: vi.fn().mockResolvedValue(false),
        });
        await expect(
            makeService(noCategory).update('h-1', 'tx-1', input),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect(noCategory.updateTransaction).not.toHaveBeenCalled();
    });

    it('rejects a non-positive amount', async () => {
        const repo = makeRepo();
        await expect(
            makeService(repo).update('h-1', 'tx-1', { ...input, amount: -1 }),
        ).rejects.toBeInstanceOf(ValidationError);
        expect(repo.updateTransaction).not.toHaveBeenCalled();
    });
});

describe('TransactionService.delete', () => {
    it('deletes the row of the household', async () => {
        const repo = makeRepo();
        await expect(
            makeService(repo).delete('h-1', 'tx-1'),
        ).resolves.toBeUndefined();
        expect(repo.deleteTransaction).toHaveBeenCalledWith('h-1', 'tx-1');
    });

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
    it('reports the sums in the household currency', async () => {
        const repo = makeRepo({
            sumByRange: vi
                .fn()
                .mockResolvedValue({ income: 200, expenses: 180 }),
        });
        const range = {
            from: new Date('2026-09-01'),
            to: new Date('2026-10-01'),
        };

        const stats = await makeService(repo).getStats('h-1', range);

        expect(stats).toEqual({
            currency: 'CHF',
            income: 200,
            expenses: 180,
            net: 20,
        });
        expect(repo.sumByRange).toHaveBeenCalledWith('h-1', range);
    });

    it('reports a negative net when expenses exceed income', async () => {
        const repo = makeRepo({
            sumByRange: vi
                .fn()
                .mockResolvedValue({ income: 100, expenses: 250 }),
        });
        const stats = await makeService(repo).getStats('h-1', {
            from: new Date('2026-09-01'),
            to: new Date('2026-10-01'),
        });
        expect(stats.net).toBe(-150);
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
        await expect(
            service.getStats('h-1', { from: new Date('nope'), to: day }),
        ).rejects.toBeInstanceOf(ValidationError);
    });
});

describe('TransactionService.getCategoryStats', () => {
    const range = { from: new Date('2026-09-01'), to: new Date('2026-10-01') };
    const rows: CategoryExpense[] = [
        { categoryId: 'c1', categoryName: 'Food', expenses: 2000 },
        { categoryId: null, categoryName: null, expenses: 5000 },
        { categoryId: 'c2', categoryName: 'Rent', expenses: 5000 },
        { categoryId: 'c3', categoryName: 'Bills', expenses: 5000 },
    ];

    it('sorts by expenses descending, ties by name with uncategorized last', async () => {
        const repo = makeRepo({
            sumExpensesByCategory: vi.fn().mockResolvedValue(rows),
        });

        await expect(
            makeService(repo).getCategoryStats('h-1', range),
        ).resolves.toEqual({
            currency: 'CHF',
            categories: [
                { categoryId: 'c3', categoryName: 'Bills', expenses: 5000 },
                { categoryId: 'c2', categoryName: 'Rent', expenses: 5000 },
                { categoryId: null, categoryName: null, expenses: 5000 },
                { categoryId: 'c1', categoryName: 'Food', expenses: 2000 },
            ],
        });
        expect(repo.sumExpensesByCategory).toHaveBeenCalledWith('h-1', range);
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
