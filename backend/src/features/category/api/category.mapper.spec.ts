import { describe, expect, it } from 'vitest';
import type { Category } from '../model/category.js';
import { CategoryDto } from '../model/category.dto.js';
import { toCategoriesDto, toCategoryDto } from './category.mapper.js';

const category: Category = {
    id: 'cat-1',
    name: 'Groceries',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    transactionCount: 3,
};

describe('category mappers', () => {
    it('copies every field and serializes the creation date', () => {
        const dto = toCategoryDto(category);
        expect(dto).toBeInstanceOf(CategoryDto);
        expect({ ...dto }).toEqual({
            id: 'cat-1',
            name: 'Groceries',
            createdAt: '2026-01-01T00:00:00.000Z',
            transactionCount: 3,
        });
    });

    it('maps lists in order', () => {
        expect(
            toCategoriesDto([category, { ...category, id: 'cat-2' }]).map(
                (c) => c.id,
            ),
        ).toEqual(['cat-1', 'cat-2']);
    });
});
