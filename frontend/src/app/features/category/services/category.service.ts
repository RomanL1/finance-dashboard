import { Injectable } from '@angular/core';
import { categoryGetCategories } from '../../../core/api';
import type { CategoryDto } from '../../../core/api';

@Injectable({ providedIn: 'root' })
export class CategoryService {
    async list(householdId: string): Promise<CategoryDto[]> {
        const response = await categoryGetCategories({
            path: { householdId },
            throwOnError: true,
        });
        return response.data;
    }
}
