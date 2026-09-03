import { Inject, Injectable } from '@nestjs/common';
import { CategoryRepository } from '../repository/category.repository.js';
import {
    Category,
    CreateOrUpdateCategory,
    defaultCategories,
    DefaultCategory,
} from '../model/category.js';
import {
    ConflictError,
    Id,
    newId,
    NotFoundError,
    ValidationError,
} from '../../../shared/kernel/index.js';

@Injectable()
export class CategoryService {
    constructor(@Inject() private readonly categories: CategoryRepository) {}

    async getAll(householdId: Id): Promise<Category[]> {
        return this.categories.listByHouseholdId(householdId);
    }

    async create(name: string, householdId: Id): Promise<Category> {
        const trimmedName = name?.trim();
        if (!trimmedName) {
            throw new ValidationError('Category name cannot be empty');
        }

        const existing = await this.categories.findByName(
            householdId,
            trimmedName,
        );
        if (existing) {
            throw new ConflictError(
                `Category "${trimmedName}" already exists in this household`,
            );
        }

        const entity: CreateOrUpdateCategory = {
            id: newId(),
            name: trimmedName,
        };

        try {
            return await this.categories.createCategory(entity, householdId);
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                err.message.includes('UNIQUE constraint failed')
            ) {
                throw new ConflictError(
                    `Category "${trimmedName}" already exists in this household`,
                );
            }
            throw err;
        }
    }

    async rename(householdId: Id, id: Id, renameTo: string): Promise<Category> {
        const trimmedName = renameTo?.trim();
        if (!trimmedName) {
            throw new ValidationError('Category name cannot be empty');
        }

        const existing = await this.categories.findById(householdId, id);
        if (!existing) {
            throw new NotFoundError('Category', id);
        }

        if (existing.name === trimmedName) {
            return existing;
        }

        const withSameName = await this.categories.findByName(
            householdId,
            trimmedName,
        );
        if (withSameName && withSameName.id !== id) {
            throw new ConflictError(
                `Category "${trimmedName}" already exists in this household`,
            );
        }

        const entity: CreateOrUpdateCategory = {
            id: id,
            name: trimmedName,
        };

        const updated = await this.categories.renameCategory(
            householdId,
            entity,
        );
        if (!updated) {
            throw new NotFoundError('Category', id);
        }

        return updated;
    }

    async delete(householdId: Id, id: Id): Promise<void> {
        const deleted = await this.categories.deleteCategory(householdId, id);
        if (!deleted) {
            throw new NotFoundError('Category', id);
        }
    }

    getDefaultCategories(): DefaultCategory[] {
        return defaultCategories;
    }

    /** Onboarding cannot complete with zero categories, regardless of what the client sent. */
    async assertHasCategories(householdId: Id): Promise<void> {
        const existing = await this.categories.listByHouseholdId(householdId);
        if (existing.length === 0) {
            throw new ValidationError('At least one category must be selected');
        }
    }
}
