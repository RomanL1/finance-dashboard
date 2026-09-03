import type { Id } from '../../../shared/kernel/index.js';

export interface CreateAccount {
    id: Id;
    description: string;
    currency: string;
    initialValue: number;
    amount: number;
    startDate: Date;
}

/** Domain model. Independent of persistence and transport shapes. */
export interface Account {
    id: Id;
    householdId: Id;
    description: string;
    currency: string;
    initialValue: number;
    amount: number;
    startDate: Date;
    createdAt: Date;
}
