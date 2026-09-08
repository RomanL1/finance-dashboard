import {
    newId,
    ValidationError,
    type Id,
} from '../../../shared/kernel/index.js';

export interface CreateOrUpdateCategory {
    id: Id;
    name: string;
}

export interface Category {
    id: Id;
    name: string;
    createdAt: Date;
    /** Transactions currently assigned to this category. Drives the delete flow in the UI. */
    transactionCount: number;
}

/** What happens to a deleted category's transactions. */
export interface DeleteCategoryOptions {
    /** Reassign transactions to this category. Omitted: they become uncategorized. */
    transferTo?: Id;
}

export interface DefaultCategory {
    translateKey: string;
}

/** Domain rules for a new category, independent of how it is persisted. */
export function buildCategory(name: string): CreateOrUpdateCategory {
    const trimmedName = name?.trim();
    if (!trimmedName) {
        throw new ValidationError('Category name cannot be empty');
    }
    return { id: newId(), name: trimmedName };
}

/** Names are unique per household, so a batch submitted at once must not repeat one. */
export function assertUniqueCategoryNames(names: string[]): void {
    const normalized = names.map((name) => name.trim().toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
        throw new ValidationError('Category names must be unique');
    }
}

export const defaultCategories: DefaultCategory[] = [
    { translateKey: 'HOUSING' },
    { translateKey: 'GROCERIES' },
    { translateKey: 'DINING_OUT' },
    { translateKey: 'TRANSPORTATION' },
    { translateKey: 'SHOPPING' },
    { translateKey: 'HEALTH' },
    { translateKey: 'ENTERTAINMENT' },
    { translateKey: 'EDUCATION' },
    { translateKey: 'PERSONAL_CARE' },
    { translateKey: 'GIFT_DONATIONS' },
    { translateKey: 'BILLS_SUBSCRIPTIONS' },
    { translateKey: 'SAVINGS_INVESTMENTS' },
    { translateKey: 'DEBT_PAYMENTS' },
    { translateKey: 'MISC' },
];
