import { describe, expect, it, vi } from 'vitest';
import {
    NotFoundError,
    ValidationError,
} from '../../../shared/kernel/index.js';
import type { CreateTransaction } from '../model/transaction.js';
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
        updateTransaction: vi
            .fn()
            .mockImplementation((_h: string, entity: CreateTransaction) =>
                Promise.resolve({ ...entity, createdAt: new Date() }),
            ),
        deleteTransaction: vi.fn().mockResolvedValue(true),
        ...overrides,
    } as unknown as TransactionRepository;
}

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

describe('TransactionService.update', () => {
    it('keeps the id, validates references, replaces every field', async () => {
        const repo = makeRepo();
        const updated = await new TransactionService(repo).update(
            'h-1',
            'tx-1',
            input,
        );

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
            new TransactionService(repo).update('h-1', 'tx-1', input),
        ).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('TransactionService.delete', () => {
    it('throws NotFound when nothing was deleted', async () => {
        const repo = makeRepo({
            deleteTransaction: vi.fn().mockResolvedValue(false),
        });
        await expect(
            new TransactionService(repo).delete('h-1', 'tx-1'),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect(repo.deleteTransaction).toHaveBeenCalledWith('h-1', 'tx-1');
    });
});
