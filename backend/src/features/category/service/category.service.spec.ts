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
    transactionCount: 0,
};

type RepoFake = Pick<
    CategoryRepository,
    | 'listByHouseholdId'
    | 'findById'
    | 'findByName'
    | 'createCategory'
    | 'renameCategory'
    | 'deleteCategory'
>;

function makeRepo(overrides: Partial<RepoFake> = {}): RepoFake {
    const saved = (entity: CreateOrUpdateCategory): Category => ({
        id: entity.id,
        name: entity.name,
        createdAt: new Date('2026-01-01'),
        transactionCount: 0,
    });
    return {
        listByHouseholdId: vi
            .fn<RepoFake['listByHouseholdId']>()
            .mockResolvedValue([dummyCategory]),
        findById: vi
            .fn<RepoFake['findById']>()
            .mockResolvedValue(dummyCategory),
        findByName: vi.fn<RepoFake['findByName']>().mockResolvedValue(null),
        createCategory: vi.fn<RepoFake['createCategory']>((entity) =>
            Promise.resolve(saved(entity)),
        ),
        renameCategory: vi.fn<RepoFake['renameCategory']>(
            (_householdId, entity) => Promise.resolve(saved(entity)),
        ),
        deleteCategory: vi
            .fn<RepoFake['deleteCategory']>()
            .mockResolvedValue(true),
        ...overrides,
    };
}

function makeService(repo: RepoFake) {
    return new CategoryService(repo as CategoryRepository);
}

describe('CategoryService', () => {
    describe('getAll', () => {
        it('returns all categories for a household', async () => {
            const repo = makeRepo();
            const service = makeService(repo);

            const categories = await service.getAll('household-1');

            expect(categories).toEqual([dummyCategory]);
            expect(repo.listByHouseholdId).toHaveBeenCalledWith('household-1');
        });

        it('returns empty array when household has no categories', async () => {
            const repo = makeRepo({
                listByHouseholdId: vi.fn().mockResolvedValue([]),
            });
            const service = makeService(repo);

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
            const service = makeService(repo);

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
            const service = makeService(makeRepo());

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
            const service = makeService(repo);

            await expect(
                service.create('Groceries', 'household-1'),
            ).rejects.toBeInstanceOf(ConflictError);
            expect(repo.createCategory).not.toHaveBeenCalled();
        });
        it('throws ConflictError when a concurrent insert wins the unique constraint', async () => {
            const repo = makeRepo({
                createCategory: vi
                    .fn()
                    .mockRejectedValue(
                        new Error(
                            'UNIQUE constraint failed: category.household_id, category.name',
                        ),
                    ),
            });
            const service = makeService(repo);

            await expect(
                service.create('Groceries', 'household-1'),
            ).rejects.toBeInstanceOf(ConflictError);
        });

        it('rethrows other persistence errors unchanged', async () => {
            const failure = new Error('disk I/O error');
            const repo = makeRepo({
                createCategory: vi.fn().mockRejectedValue(failure),
            });
            const service = makeService(repo);

            await expect(
                service.create('Groceries', 'household-1'),
            ).rejects.toBe(failure);
        });

        it('trims the name before checking for duplicates', async () => {
            const repo = makeRepo();
            const service = makeService(repo);

            const created = await service.create('  Groceries ', 'household-1');

            expect(created.name).toBe('Groceries');
            expect(repo.findByName).toHaveBeenCalledWith(
                'household-1',
                'Groceries',
            );
        });
    });

    describe('rename', () => {
        it('renames an existing category with the specified id and new name', async () => {
            const repo = makeRepo();
            const service = makeService(repo);

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
            const service = makeService(repo);

            const result = await service.rename(
                'household-1',
                'cat-1',
                'Groceries',
            );

            expect(result).toEqual(dummyCategory);
            expect(repo.renameCategory).not.toHaveBeenCalled();
        });

        it('throws ValidationError when new category name is empty or whitespace', async () => {
            const service = makeService(makeRepo());

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
            const service = makeService(repo);

            await expect(
                service.rename('household-1', 'non-existent', 'Supermarket'),
            ).rejects.toBeInstanceOf(NotFoundError);
        });

        it('throws ConflictError when renaming to a name that another category uses', async () => {
            const otherCategory: Category = {
                id: 'cat-2',
                name: 'Rent',
                createdAt: new Date('2026-01-01'),
                transactionCount: 0,
            };
            const repo = makeRepo({
                findById: vi.fn().mockResolvedValue(dummyCategory),
                findByName: vi.fn().mockResolvedValue(otherCategory),
            });
            const service = makeService(repo);

            await expect(
                service.rename('household-1', 'cat-1', 'Rent'),
            ).rejects.toBeInstanceOf(ConflictError);
            expect(repo.renameCategory).not.toHaveBeenCalled();
        });
        it('trims the new name before comparing and saving', async () => {
            const repo = makeRepo();
            const service = makeService(repo);

            await service.rename('household-1', 'cat-1', '  Supermarket  ');

            expect(repo.findByName).toHaveBeenCalledWith(
                'household-1',
                'Supermarket',
            );
            expect(repo.renameCategory).toHaveBeenCalledWith('household-1', {
                id: 'cat-1',
                name: 'Supermarket',
            });
        });

        it('allows a case-only change of its own name', async () => {
            const repo = makeRepo({
                findByName: vi.fn().mockResolvedValue(dummyCategory),
            });
            const service = makeService(repo);

            const renamed = await service.rename(
                'household-1',
                'cat-1',
                'groceries',
            );

            expect(renamed.name).toBe('groceries');
            expect(repo.renameCategory).toHaveBeenCalledOnce();
        });

        it('throws NotFoundError when the category vanishes before the update', async () => {
            const repo = makeRepo({
                renameCategory: vi.fn().mockResolvedValue(null),
            });
            const service = makeService(repo);

            await expect(
                service.rename('household-1', 'cat-1', 'Supermarket'),
            ).rejects.toBeInstanceOf(NotFoundError);
        });
    });

    describe('delete', () => {
        it('deletes a category by householdId and categoryId', async () => {
            const repo = makeRepo();
            const service = makeService(repo);

            await expect(
                service.delete('household-1', 'cat-1'),
            ).resolves.toBeUndefined();
            expect(repo.deleteCategory).toHaveBeenCalledWith(
                'household-1',
                'cat-1',
                {},
            );
        });

        it('transfers transactions to another category of the household', async () => {
            const target: Category = { ...dummyCategory, id: 'cat-2' };
            const repo = makeRepo({
                findById: vi.fn().mockResolvedValue(target),
            });
            const service = makeService(repo);

            await service.delete('household-1', 'cat-1', {
                transferTo: 'cat-2',
            });

            expect(repo.findById).toHaveBeenCalledWith('household-1', 'cat-2');
            expect(repo.deleteCategory).toHaveBeenCalledWith(
                'household-1',
                'cat-1',
                { transferTo: 'cat-2' },
            );
        });

        it('throws ValidationError when transferring to the deleted category itself', async () => {
            const repo = makeRepo();
            const service = makeService(repo);

            await expect(
                service.delete('household-1', 'cat-1', { transferTo: 'cat-1' }),
            ).rejects.toBeInstanceOf(ValidationError);
            expect(repo.deleteCategory).not.toHaveBeenCalled();
        });

        it('throws NotFoundError when transfer target is not in the household', async () => {
            const repo = makeRepo({
                findById: vi.fn().mockResolvedValue(null),
            });
            const service = makeService(repo);

            await expect(
                service.delete('household-1', 'cat-1', { transferTo: 'cat-9' }),
            ).rejects.toBeInstanceOf(NotFoundError);
            expect(repo.deleteCategory).not.toHaveBeenCalled();
        });

        it('throws NotFoundError when category does not exist in household', async () => {
            const repo = makeRepo({
                deleteCategory: vi.fn().mockResolvedValue(false),
            });
            const service = makeService(repo);

            await expect(
                service.delete('household-1', 'non-existent'),
            ).rejects.toBeInstanceOf(NotFoundError);
        });
        it('throws NotFoundError before transferring when the source is not in the household', async () => {
            const repo = makeRepo({
                findById: vi
                    .fn()
                    .mockImplementation((_hh: string, id: string) =>
                        Promise.resolve(
                            id === 'cat-2'
                                ? { ...dummyCategory, id: 'cat-2' }
                                : null,
                        ),
                    ),
            });
            const service = makeService(repo);

            await expect(
                service.delete('household-1', 'foreign', {
                    transferTo: 'cat-2',
                }),
            ).rejects.toBeInstanceOf(NotFoundError);
            expect(repo.deleteCategory).not.toHaveBeenCalled();
        });

        it('skips the lookups when transactions are just uncategorized', async () => {
            const repo = makeRepo();
            const service = makeService(repo);

            await service.delete('household-1', 'cat-1', {});

            expect(repo.findById).not.toHaveBeenCalled();
        });
    });

    describe('getDefaultCategories', () => {
        it('returns the built-in presets', () => {
            const defaults = makeService(makeRepo()).getDefaultCategories();

            expect(defaults.length).toBeGreaterThan(0);
            expect(defaults).toContainEqual({ translateKey: 'MISC' });
        });
    });
});
