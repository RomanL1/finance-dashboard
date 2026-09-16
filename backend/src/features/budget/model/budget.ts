import {
    newId,
    ValidationError,
    type Id,
} from '../../../shared/kernel/index.js';

/** Calendar month as `YYYY-MM`. */
export type Month = string;

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface Budget {
    id: Id;
    categoryId: Id;
    month: Month;
    /** Minor units. 0 is a deliberate zero limit; the absence of a budget means no limit. */
    amount: number;
}

export interface SetBudgetInput {
    categoryId: Id;
    month: Month;
    amount: number;
}

export function assertValidMonth(month: string): void {
    if (!MONTH_PATTERN.test(month)) {
        throw new ValidationError('Month must be formatted as YYYY-MM');
    }
}

/** Domain rules for a limit, independent of whether it is created or replaced. */
export function buildBudget(input: SetBudgetInput): Budget {
    assertValidMonth(input.month);
    if (!Number.isInteger(input.amount) || input.amount < 0) {
        throw new ValidationError(
            'Budget amount must be a non-negative integer',
        );
    }
    return {
        id: newId(),
        categoryId: input.categoryId,
        month: input.month,
        amount: input.amount,
    };
}
