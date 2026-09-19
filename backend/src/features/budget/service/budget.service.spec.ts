import { describe, expect, it, vi } from 'vitest';
import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from '../../../shared/kernel/index.js';
import type { CategoryService } from '../../category/service/category.service.js';
import type { Budget } from '../model/budget.js';
import type { BudgetRepository } from '../repository/budget.repository.js';
import { BudgetService } from './budget.service.js';

const dummyBudget: Budget = {
    id: 'budget-1',
    categoryId: 'cat-1',
    month: '2026-09',
    amount: 50000,
};

function makeRepo(overrides: Partial<BudgetRepository> = {}) {
    return {
        listByMonth: vi.fn().mockResolvedValue([dummyBudget]),
        find: vi.fn().mockResolvedValue(dummyBudget),
        upsert: vi
            .fn()
            .mockImplementation((entity: Budget) => Promise.resolve(entity)),
        delete: vi.fn().mockResolvedValue(true),
        latestMonthBefore: vi.fn().mockResolvedValue('2026-08'),
        insertMany: vi
            .fn()
            .mockImplementation((rows: Budget[]) => Promise.resolve(rows)),
        ...overrides,
    } as unknown as BudgetRepository;
}

function makeCategories(ids: string[] = ['cat-1']) {
    return {
        getAll: vi.fn().mockResolvedValue(ids.map((id) => ({ id, name: id }))),
    } as unknown as CategoryService;
}

describe('BudgetService', () => {
    describe('getByMonth', () => {
        it('returns the limits of the month', async () => {
            const repo = makeRepo();
            const service = new BudgetService(repo, makeCategories());

            await expect(
                service.getByMonth('hh-1', '2026-09'),
            ).resolves.toEqual([dummyBudget]);
            expect(repo.listByMonth).toHaveBeenCalledWith('hh-1', '2026-09');
        });

        it('rejects a malformed month', async () => {
            const service = new BudgetService(makeRepo(), makeCategories());

            await expect(service.getByMonth('hh-1', '2026-13')).rejects.toThrow(
                ValidationError,
            );
            await expect(service.getByMonth('hh-1', '2026-9')).rejects.toThrow(
                ValidationError,
            );
        });
    });

    describe('set', () => {
        it('upserts a limit for a category of the household', async () => {
            const repo = makeRepo();
            const service = new BudgetService(repo, makeCategories());

            const result = await service.set('hh-1', {
                categoryId: 'cat-1',
                month: '2026-09',
                amount: 0,
            });

            expect(result).toMatchObject({
                categoryId: 'cat-1',
                month: '2026-09',
                amount: 0,
            });
            expect(result.id).toBeDefined();
            expect(repo.upsert).toHaveBeenCalledOnce();
        });

        it('rejects a category of another household', async () => {
            const repo = makeRepo();
            const service = new BudgetService(repo, makeCategories(['other']));

            await expect(
                service.set('hh-1', {
                    categoryId: 'cat-1',
                    month: '2026-09',
                    amount: 100,
                }),
            ).rejects.toThrow(NotFoundError);
            expect(repo.upsert).not.toHaveBeenCalled();
        });

        it.each([-1, 1.5, Number.NaN])('rejects amount %s', async (amount) => {
            const repo = makeRepo();
            const service = new BudgetService(repo, makeCategories());

            await expect(
                service.set('hh-1', {
                    categoryId: 'cat-1',
                    month: '2026-09',
                    amount,
                }),
            ).rejects.toThrow(ValidationError);
            expect(repo.upsert).not.toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('deletes the limit', async () => {
            const repo = makeRepo();
            const service = new BudgetService(repo, makeCategories());

            await service.remove('hh-1', 'cat-1', '2026-09');

            expect(repo.delete).toHaveBeenCalledWith(
                'hh-1',
                'cat-1',
                '2026-09',
            );
        });

        it('throws when there is no limit to remove', async () => {
            const repo = makeRepo({ delete: vi.fn().mockResolvedValue(false) });
            const service = new BudgetService(repo, makeCategories());

            await expect(
                service.remove('hh-1', 'cat-1', '2026-09'),
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe('copyFromPrevious', () => {
        const august: Budget[] = [
            { id: 'b-1', categoryId: 'cat-1', month: '2026-08', amount: 50000 },
            { id: 'b-2', categoryId: 'cat-2', month: '2026-08', amount: 0 },
        ];

        function makeCopyRepo(overrides: Partial<BudgetRepository> = {}) {
            return makeRepo({
                listByMonth: vi
                    .fn()
                    .mockImplementation((_hh: string, month: string) =>
                        Promise.resolve(month === '2026-08' ? august : []),
                    ),
                ...overrides,
            });
        }

        it('copies every limit of the nearest earlier month as new rows', async () => {
            const repo = makeCopyRepo();
            const service = new BudgetService(repo, makeCategories());

            const result = await service.copyFromPrevious('hh-1', '2026-10');

            expect(result.sourceMonth).toBe('2026-08');
            expect(result.budgets).toEqual([
                expect.objectContaining({
                    categoryId: 'cat-1',
                    month: '2026-10',
                    amount: 50000,
                }),
                expect.objectContaining({
                    categoryId: 'cat-2',
                    month: '2026-10',
                    amount: 0,
                }),
            ]);
            expect(result.budgets.map((b) => b.id)).not.toContain('b-1');
            expect(repo.latestMonthBefore).toHaveBeenCalledWith(
                'hh-1',
                '2026-10',
            );
            expect(repo.insertMany).toHaveBeenCalledOnce();
        });

        it('returns nothing when no earlier month has limits', async () => {
            const repo = makeCopyRepo({
                latestMonthBefore: vi.fn().mockResolvedValue(null),
            });
            const service = new BudgetService(repo, makeCategories());

            await expect(
                service.copyFromPrevious('hh-1', '2026-10'),
            ).resolves.toEqual({ sourceMonth: null, budgets: [] });
            expect(repo.insertMany).not.toHaveBeenCalled();
        });

        it('refuses a month that already has limits', async () => {
            const repo = makeCopyRepo({
                listByMonth: vi.fn().mockResolvedValue(august),
            });
            const service = new BudgetService(repo, makeCategories());

            await expect(
                service.copyFromPrevious('hh-1', '2026-10'),
            ).rejects.toThrow(ConflictError);
            expect(repo.insertMany).not.toHaveBeenCalled();
        });

        it('rejects a malformed month', async () => {
            const service = new BudgetService(makeCopyRepo(), makeCategories());

            await expect(
                service.copyFromPrevious('hh-1', '2026-1'),
            ).rejects.toThrow(ValidationError);
        });
    });
});
