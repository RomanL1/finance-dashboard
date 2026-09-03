import type { Id } from '../../../shared/kernel/index.js';

export interface CreateOrUpdateCategory {
    id: Id;
    name: string;
}

export interface Category {
    id: Id;
    name: string;
    createdAt: Date;
}

export interface DefaultCategory {
    translateKey: string,
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
