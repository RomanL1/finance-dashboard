import { describe, expect, it, vi } from 'vitest';
import {
    NotFoundError,
    ValidationError,
} from '../../../shared/kernel/index.js';
import { balanceDelta, type CreateTransaction } from '../model/transaction.js';
import type { TransactionRepository } from '../repository/transaction.repository.js';
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
        ...overrides,
    } as unknown as TransactionRepository;
}

describe('balanceDelta', () => {
    it('expense subtracts, income adds', () => {
        expect(balanceDelta({ type: 'expense', amount: 5 })).toBe(-5);
        expect(balanceDelta({ type: 'income', amount: 5 })).toBe(5);
    });
});

describe('TransactionService.create', () => {
    it('trims title, nulls blank description, persists', async () => {
        const repo = makeRepo();
        const created = await new TransactionService(repo).create('h-1', input);

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
        const created = await new TransactionService(repo).create('h-1', {
            ...input,
            title: ' ',
            categoryId: null,
        });

        expect(created.title).toBeNull();
        expect(created.categoryId).toBeNull();
        expect(repo.categoryExists).not.toHaveBeenCalled();
    });

    it('rejects non-positive amount', async () => {
        const service = new TransactionService(makeRepo());
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
            new TransactionService(noAccount).create('h-1', input),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect(noAccount.createTransaction).not.toHaveBeenCalled();

        const noCategory = makeRepo({
            categoryExists: vi.fn().mockResolvedValue(false),
        });
        await expect(
            new TransactionService(noCategory).create('h-1', input),
        ).rejects.toBeInstanceOf(NotFoundError);
    });
});
