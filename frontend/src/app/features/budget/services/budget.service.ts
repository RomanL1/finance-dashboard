import { Injectable } from '@angular/core';
import {
    budgetDeleteBudget,
    budgetGetBudgets,
    budgetSetBudget,
} from '../../../core/api';
import type { BudgetDto } from '../budget.types';

@Injectable({ providedIn: 'root' })
export class BudgetService {
    /** Limits of one `YYYY-MM` month; categories without a limit are absent. */
    async list(householdId: string, month: string): Promise<BudgetDto[]> {
        const response = await budgetGetBudgets({
            path: { householdId },
            query: { month },
            throwOnError: true,
        });
        return response.data;
    }

    /** Creates the limit or replaces its amount. */
    async set(
        householdId: string,
        categoryId: string,
        month: string,
        amount: number,
    ): Promise<BudgetDto> {
        const response = await budgetSetBudget({
            path: { householdId, categoryId, month },
            body: { amount },
            throwOnError: true,
        });
        return response.data;
    }

    async remove(
        householdId: string,
        categoryId: string,
        month: string,
    ): Promise<void> {
        await budgetDeleteBudget({
            path: { householdId, categoryId, month },
            throwOnError: true,
        });
    }
}
