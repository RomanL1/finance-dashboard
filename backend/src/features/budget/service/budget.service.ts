import { Inject, Injectable } from '@nestjs/common';
import {
    ConflictError,
    type Id,
    NotFoundError,
} from '../../../shared/kernel/index.js';
import { CategoryService } from '../../category/service/category.service.js';
import {
    assertValidMonth,
    buildBudget,
    copyBudgets,
    type Budget,
    type CopiedBudgets,
    type Month,
    type SetBudgetInput,
} from '../model/budget.js';
import { BudgetRepository } from '../repository/budget.repository.js';

@Injectable()
export class BudgetService {
    constructor(
        @Inject() private readonly budgets: BudgetRepository,
        @Inject() private readonly categories: CategoryService,
    ) {}

    async getByMonth(householdId: Id, month: Month): Promise<Budget[]> {
        assertValidMonth(month);
        return this.budgets.listByMonth(householdId, month);
    }

    /** Creates the limit or replaces its amount. The category must belong to the household. */
    async set(householdId: Id, input: SetBudgetInput): Promise<Budget> {
        const entity = buildBudget(input);
        await this.assertCategory(householdId, input.categoryId);
        return this.budgets.upsert(entity);
    }

    async remove(householdId: Id, categoryId: Id, month: Month): Promise<void> {
        assertValidMonth(month);
        const deleted = await this.budgets.delete(
            householdId,
            categoryId,
            month,
        );
        if (!deleted) {
            throw new NotFoundError('Budget', `${categoryId}/${month}`);
        }
    }

    /**
     * Fills an empty month with the limits of the nearest earlier month that has any (story S4).
     * The copies are independent rows, so editing them leaves the source month untouched.
     */
    async copyFromPrevious(
        householdId: Id,
        month: Month,
    ): Promise<CopiedBudgets> {
        assertValidMonth(month);
        const existing = await this.budgets.listByMonth(householdId, month);
        if (existing.length > 0) {
            throw new ConflictError(`Month ${month} already has limits`);
        }
        const sourceMonth = await this.budgets.latestMonthBefore(
            householdId,
            month,
        );
        if (sourceMonth === null) {
            return { sourceMonth: null, budgets: [] };
        }
        const source = await this.budgets.listByMonth(householdId, sourceMonth);
        const budgets = await this.budgets.insertMany(
            copyBudgets(source, month),
        );
        return { sourceMonth, budgets };
    }

    private async assertCategory(
        householdId: Id,
        categoryId: Id,
    ): Promise<void> {
        const categories = await this.categories.getAll(householdId);
        if (!categories.some((c) => c.id === categoryId)) {
            throw new NotFoundError('Category', categoryId);
        }
    }
}
