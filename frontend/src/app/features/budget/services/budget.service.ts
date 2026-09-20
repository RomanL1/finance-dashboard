import { Injectable } from '@angular/core';
import {
    budgetCopyPreviousBudgets,
    budgetDeleteBudget,
    budgetGetBudgets,
    budgetSetBudget,
} from '../../../core/api';
import {
    isAutoInheritMonth,
    type BudgetDto,
    type CopiedBudgetsDto,
    type MonthBudgets,
} from '../budget.types';

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

    /**
     * The month as every view should see it: an empty current or next month is first filled from the
     * previous limits (story S4), so the dashboard and the budgets tab agree whichever is opened first.
     */
    async loadMonth(householdId: string, month: string): Promise<MonthBudgets> {
        const budgets = await this.list(householdId, month);
        if (budgets.length > 0 || !isAutoInheritMonth(month)) {
            return { budgets, inheritedFrom: null };
        }
        const copied = await this.copyPrevious(householdId, month);
        return { budgets: copied.budgets, inheritedFrom: copied.sourceMonth };
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

    /**
     * Fills an empty month with copies of the nearest earlier month's limits. `sourceMonth` is null
     * when there was nothing to copy. Fails with 409 when the month already has limits.
     */
    async copyPrevious(
        householdId: string,
        month: string,
    ): Promise<CopiedBudgetsDto> {
        const response = await budgetCopyPreviousBudgets({
            path: { householdId, month },
            throwOnError: true,
        });
        return response.data;
    }
}
