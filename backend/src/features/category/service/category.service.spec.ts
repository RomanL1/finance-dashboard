import { describe, expect, it, vi } from 'vitest';
import {
    ConflictError,
    NotFoundError,
    ValidationError,
} from '../../../shared/kernel/index.js';
import type { Category, CreateOrUpdateCategory } from '../model/category.js';
import type { CategoryRepository } from '../repository/category.repository.js';
import { CategoryService } from './category.service.js';

const dummyCategory: Category = {
    id: 'cat-1',
    name: 'Groceries',
    createdAt: new Date('2026-01-01'),
};

function makeRepo(overrides: Partial<CategoryRepository> = {}) {
    return {
        listByHouseholdId: vi.fn().mockResolvedValue([dummyCategory]),
        findById: vi.fn().mockResolvedValue(dummyCategory),
        findByName: vi.fn().mockResolvedValue(null),
        createCategory: vi
            .fn()
            .mockImplementation((entity: CreateOrUpdateCategory) =>
                Promise.resolve({
                    id: entity.id,
                    name: entity.name,
                    createdAt: new Date('2026-01-01'),
                }),
            ),
        renameCategory: vi
            .fn()
            .mockImplementation(
                (_householdId: string, entity: CreateOrUpdateCategory) =>
                    Promise.resolve({
                        id: entity.id,
                        name: entity.name,
                        createdAt: new Date('2026-01-01'),
                    }),
            ),
        deleteCategory: vi.fn().mockResolvedValue(true),
        ...overrides,
    } as unknown as CategoryRepository;
}

describe('CategoryService', () => {
    describe('getAll', () => {
        it('returns all categories for a household', async () => {
            const repo = makeRepo();
            const service = new CategoryService(repo);

            const categories = await service.getAll('household-1');

            expect(categories).toEqual([dummyCategory]);
            expect(repo.listByHouseholdId).toHaveBeenCalledWith('household-1');
        });

        it('returns empty array when household has no categories', async () => {
            const repo = makeRepo({
                listByHouseholdId: vi.fn().mockResolvedValue([]),
            });
            const service = new CategoryService(repo);

            const categories = await service.getAll('household-empty');

            expect(categories).toEqual([]);
            expect(repo.listByHouseholdId).toHaveBeenCalledWith(
                'household-empty',
            );
        });
    });

    describe('create', () => {
        it('creates a category with a generated id and assigns it to the household', async () => {
            const repo = makeRepo();
            const service = new CategoryService(repo);

            const created = await service.create('Groceries', 'household-1');

            expect(created.name).toBe('Groceries');
            expect(created.id).toBeDefined();
            expect(typeof created.id).toBe('string');
            expect(repo.findByName).toHaveBeenCalledWith(
                'household-1',
                'Groceries',
            );
            expect(repo.createCategory).toHaveBeenCalledWith(
                {
                    id: expect.any(String),
                    name: 'Groceries',
                },
                'household-1',
            );
        });

        it('throws ValidationError when category name is empty or whitespace', async () => {
            const service = new CategoryService(makeRepo());

            await expect(
                service.create('', 'household-1'),
            ).rejects.toBeInstanceOf(ValidationError);
            await expect(
                service.create('   ', 'household-1'),
            ).rejects.toBeInstanceOf(ValidationError);
        });

        it('throws ConflictError when a category with the same name already exists', async () => {
            const repo = makeRepo({
                findByName: vi.fn().mockResolvedValue(dummyCategory),
            });
            const service = new CategoryService(repo);

            await expect(
                service.create('Groceries', 'household-1'),
            ).rejects.toBeInstanceOf(ConflictError);
            expect(repo.createCategory).not.toHaveBeenCalled();
        });
    });

    describe('rename', () => {
        it('renames an existing category with the specified id and new name', async () => {
            const repo = makeRepo();
            const service = new CategoryService(repo);

            const renamed = await service.rename(
                'household-1',
                'cat-1',
                'Supermarket',
            );

            expect(renamed.id).toBe('cat-1');
            expect(renamed.name).toBe('Supermarket');
            expect(repo.findById).toHaveBeenCalledWith('household-1', 'cat-1');
            expect(repo.findByName).toHaveBeenCalledWith(
                'household-1',
                'Supermarket',
            );
            expect(repo.renameCategory).toHaveBeenCalledWith('household-1', {
                id: 'cat-1',
                name: 'Supermarket',
            });
        });

        it('returns existing category without updating if rename name is identical', async () => {
            const repo = makeRepo();
            const service = new CategoryService(repo);

            const result = await service.rename(
                'household-1',
                'cat-1',
                'Groceries',
            );

            expect(result).toEqual(dummyCategory);
            expect(repo.renameCategory).not.toHaveBeenCalled();
        });

        it('throws ValidationError when new category name is empty or whitespace', async () => {
            const service = new CategoryService(makeRepo());

            await expect(
                service.rename('household-1', 'cat-1', ''),
            ).rejects.toBeInstanceOf(ValidationError);
            await expect(
                service.rename('household-1', 'cat-1', '  '),
            ).rejects.toBeInstanceOf(ValidationError);
        });

        it('throws NotFoundError when category does not exist in household', async () => {
            const repo = makeRepo({
                findById: vi.fn().mockResolvedValue(null),
            });
            const service = new CategoryService(repo);

            await expect(
                service.rename('household-1', 'non-existent', 'Supermarket'),
            ).rejects.toBeInstanceOf(NotFoundError);
        });

        it('throws ConflictError when renaming to a name that another category uses', async () => {
            const otherCategory: Category = {
                id: 'cat-2',
                name: 'Rent',
                createdAt: new Date('2026-01-01'),
            };
            const repo = makeRepo({
                findById: vi.fn().mockResolvedValue(dummyCategory),
                findByName: vi.fn().mockResolvedValue(otherCategory),
            });
            const service = new CategoryService(repo);

            await expect(
                service.rename('household-1', 'cat-1', 'Rent'),
            ).rejects.toBeInstanceOf(ConflictError);
            expect(repo.renameCategory).not.toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('deletes a category by householdId and categoryId', async () => {
            const repo = makeRepo();
            const service = new CategoryService(repo);

            await expect(
                service.delete('household-1', 'cat-1'),
            ).resolves.toBeUndefined();
            expect(repo.deleteCategory).toHaveBeenCalledWith(
                'household-1',
                'cat-1',
            );
        });

        it('throws NotFoundError when category does not exist in household', async () => {
            const repo = makeRepo({
                deleteCategory: vi.fn().mockResolvedValue(false),
            });
            const service = new CategoryService(repo);

            await expect(
                service.delete('household-1', 'non-existent'),
            ).rejects.toBeInstanceOf(NotFoundError);
        });
    });

    describe('assertHasCategories', () => {
        it('throws ValidationError when the household has no categories', async () => {
            const repo = makeRepo({
                listByHouseholdId: vi.fn().mockResolvedValue([]),
            });
            const service = new CategoryService(repo);

            await expect(
                service.assertHasCategories('household-1'),
            ).rejects.toBeInstanceOf(ValidationError);
        });

        it('resolves when the household has at least one category', async () => {
            const repo = makeRepo({
                listByHouseholdId: vi.fn().mockResolvedValue([dummyCategory]),
            });
            const service = new CategoryService(repo);

            await expect(
                service.assertHasCategories('household-1'),
            ).resolves.toBeUndefined();
        });
    });
});
