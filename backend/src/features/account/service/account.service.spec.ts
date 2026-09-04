import { describe, expect, it, vi } from 'vitest';
import {
    NotFoundError,
    ValidationError,
} from '../../../shared/kernel/index.js';
import type { Account, CreateAccount } from '../model/account.js';
import type { AccountRepository } from '../repository/account.repository.js';
import { AccountService } from './account.service.js';

const dummyAccount: Account = {
    id: 'acc-1',
    householdId: 'household-1',
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
                    createdAt: new Date('2026-01-01'),
                }),
            ),
        updateAccount: vi.fn().mockResolvedValue(dummyAccount),
        deleteAccount: vi.fn().mockResolvedValue(true),
        ...overrides,
    } as unknown as AccountRepository;
}

describe('AccountService', () => {
    describe('getAll', () => {
        it('returns all accounts for a household', async () => {
            const repo = makeRepo();
            const service = new AccountService(repo);

            const accounts = await service.getAll('household-1');

            expect(accounts).toEqual([dummyAccount]);
            expect(repo.listByHouseholdId).toHaveBeenCalledWith('household-1');
        });
    });

    describe('create', () => {
        it('creates an account with a generated id', async () => {
            const repo = makeRepo();
            const service = new AccountService(repo);

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
            const service = new AccountService(makeRepo());

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
            const service = new AccountService(repo);
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
            const service = new AccountService(
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
            await new AccountService(repo).delete('household-1', 'acc-1');
            expect(repo.deleteAccount).toHaveBeenCalledWith(
                'household-1',
                'acc-1',
            );
        });

        it('throws NotFoundError when nothing was deleted', async () => {
            const service = new AccountService(
                makeRepo({ deleteAccount: vi.fn().mockResolvedValue(false) }),
            );
            await expect(
                service.delete('household-1', 'missing'),
            ).rejects.toBeInstanceOf(NotFoundError);
        });
    });
});
