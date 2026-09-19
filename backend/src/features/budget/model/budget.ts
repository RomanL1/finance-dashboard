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

/** Outcome of copying limits into a month. `sourceMonth` is null when no earlier month had limits. */
export interface CopiedBudgets {
    sourceMonth: Month | null;
    budgets: Budget[];
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

/** Fresh rows for `month` with the amounts of `source`, so the target month is independent from now on. */
export function copyBudgets(source: Budget[], month: Month): Budget[] {
    return source.map((b) =>
        buildBudget({ categoryId: b.categoryId, month, amount: b.amount }),
    );
}
