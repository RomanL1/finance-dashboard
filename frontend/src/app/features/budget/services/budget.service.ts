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

    /** Runs the automatic take-over (ADR-2) first, so the dashboard and the budgets tab agree whichever opens first. */
    async loadMonth(householdId: string, month: string): Promise<MonthBudgets> {
        const budgets = await this.list(householdId, month);
        if (budgets.length > 0 || !isAutoInheritMonth(month)) {
            return { budgets, inheritedFrom: null, emptied: false };
        }
        const copied = await this.copyPrevious(householdId, month, true);
        return {
            budgets: copied.budgets,
            inheritedFrom: copied.sourceMonth,
            emptied: copied.skipped,
        };
    }

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

    /** Take-over per ADR-2; `auto` skips touched months. `sourceMonth` null = nothing copied; 409 when the month has limits. */
    async copyPrevious(
        householdId: string,
        month: string,
        auto = false,
    ): Promise<CopiedBudgetsDto> {
        const response = await budgetCopyPreviousBudgets({
            path: { householdId, month },
            query: auto ? { auto: true } : undefined,
            throwOnError: true,
        });
        return response.data;
    }
}
