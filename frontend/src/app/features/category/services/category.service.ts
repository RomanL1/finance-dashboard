import { Injectable } from '@angular/core';
import {
    categoryCreateCategory,
    categoryDeleteCategory,
    categoryGetCategories,
    categoryUpdateCategory,
} from '../../../core/api';
import type { CategoryDto, CreateCategoryDto } from '../category.types';

@Injectable({ providedIn: 'root' })
export class CategoryService {
    /** Sorted by name server-side. */
    async list(householdId: string): Promise<CategoryDto[]> {
        const response = await categoryGetCategories({
            path: { householdId },
            throwOnError: true,
        });
        return response.data;
    }

    async create(
        householdId: string,
        body: CreateCategoryDto,
    ): Promise<CategoryDto> {
        const response = await categoryCreateCategory({
            path: { householdId },
            body,
            throwOnError: true,
        });
        return response.data;
    }

    async rename(
        householdId: string,
        categoryId: string,
        body: CreateCategoryDto,
    ): Promise<CategoryDto> {
        const response = await categoryUpdateCategory({
            path: { householdId, categoryId },
            body,
            throwOnError: true,
        });
        return response.data;
    }

    /** Transactions move to `transferTo` when given, otherwise they become uncategorized. */
    async delete(
        householdId: string,
        categoryId: string,
        transferTo?: string,
    ): Promise<void> {
        await categoryDeleteCategory({
            path: { householdId, categoryId },
            query: transferTo ? { transferTo } : undefined,
            throwOnError: true,
        });
    }
}
