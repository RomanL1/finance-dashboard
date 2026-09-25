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
        return this.budgets.upsert(householdId, entity);
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

    /** Copies the nearest earlier limits into an empty month; `auto` skips touched months. See ADR-2. */
    async copyFromPrevious(
        householdId: Id,
        month: Month,
        auto = false,
    ): Promise<CopiedBudgets> {
        assertValidMonth(month);
        const existing = await this.budgets.listByMonth(householdId, month);
        if (existing.length > 0) {
            throw new ConflictError(`Month ${month} already has limits`);
        }
        if (auto && (await this.budgets.isMonthTouched(householdId, month))) {
            return { sourceMonth: null, budgets: [], skipped: true };
        }
        const sourceMonth = await this.budgets.latestMonthBefore(
            householdId,
            month,
        );
        if (sourceMonth === null) {
            return { sourceMonth: null, budgets: [], skipped: false };
        }
        const source = await this.budgets.listByMonth(householdId, sourceMonth);
        const budgets = await this.budgets.insertMany(
            householdId,
            month,
            copyBudgets(source, month),
        );
        return { sourceMonth, budgets, skipped: false };
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
