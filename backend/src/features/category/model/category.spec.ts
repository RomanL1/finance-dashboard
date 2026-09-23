import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../../shared/kernel/index.js';
import {
    assertUniqueCategoryNames,
    buildCategory,
    defaultCategories,
} from './category.js';

describe('buildCategory', () => {
    it('trims the name and generates an id', () => {
        expect(buildCategory('  Groceries ')).toEqual({
            id: expect.any(String),
            name: 'Groceries',
        });
    });

    it.each(['', '   '])('rejects the name %j', (name) => {
        expect(() => buildCategory(name)).toThrow(ValidationError);
    });

    it('rejects a missing name from a caller that skipped validation', () => {
        // @ts-expect-error: typed callers cannot omit it; the domain still guards untyped input.
        expect(() => buildCategory(undefined)).toThrow(ValidationError);
    });
});

describe('assertUniqueCategoryNames', () => {
    it('accepts distinct names and an empty batch', () => {
        expect(() =>
            assertUniqueCategoryNames(['Groceries', 'Housing']),
        ).not.toThrow();
        expect(() => assertUniqueCategoryNames([])).not.toThrow();
    });

    it('rejects names that only differ by case or surrounding blanks', () => {
        expect(() =>
            assertUniqueCategoryNames(['Groceries', ' groceries ']),
        ).toThrow(ValidationError);
    });
});

describe('defaultCategories', () => {
    it('has unique keys and ends with the catch-all', () => {
        const keys = defaultCategories.map((c) => c.translateKey);
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys.at(-1)).toBe('MISC');
    });
});
