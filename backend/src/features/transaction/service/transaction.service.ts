import { Inject, Injectable } from '@nestjs/common';
import { TransactionRepository } from '../repository/transaction.repository.js';
import {
    assertValidRange,
    buildTransaction,
    CategoryExpense,
    CategoryStats,
    CreateTransaction,
    CreateTransactionInput,
    CurrencyStats,
    DateRange,
    PAGE_SIZE,
    Transaction,
    TransactionFilter,
    TransactionPage,
} from '../model/transaction.js';
import {
    CLOCK,
    type Clock,
    Id,
    NotFoundError,
} from '../../../shared/kernel/index.js';
import { HouseholdService } from '../../household/service/household.service.js';

@Injectable()
export class TransactionService {
    constructor(
        @Inject() private readonly transactions: TransactionRepository,
        private readonly households: HouseholdService,
        @Inject(CLOCK) private readonly clock: Clock,
    ) {}

    /** A page past the end is empty, not an error. */
    async getPage(
        householdId: Id,
        filter: TransactionFilter,
        page: number,
        pageSize = PAGE_SIZE,
    ): Promise<TransactionPage> {
        const now = this.clock.now();
        const [items, total] = await Promise.all([
            this.transactions.listByHouseholdId(
                householdId,
                filter,
                pageSize,
                (page - 1) * pageSize,
                now,
            ),
            this.transactions.countByHouseholdId(householdId, filter, now),
        ]);
        return { items, total, page, pageSize };
    }

    /** Income / expenses / net in the household currency. Future-dated entries inside the range count. */
    async getStats(householdId: Id, range: DateRange): Promise<CurrencyStats> {
        assertValidRange(range);
        const household = await this.households.getById(householdId);
        const { income, expenses } = await this.transactions.sumByRange(
            householdId,
            range,
        );
        return {
            currency: household.baseCurrency,
            income,
            expenses,
            net: income - expenses,
        };
    }

    async getCategoryStats(
        householdId: Id,
        range: DateRange,
    ): Promise<CategoryStats> {
        assertValidRange(range);
        const household = await this.households.getById(householdId);
        const categories = await this.transactions.sumExpensesByCategory(
            householdId,
            range,
        );
        return {
            currency: household.baseCurrency,
            categories: categories.toSorted(compareCategoryExpense),
        };
    }

    async create(
        householdId: Id,
        input: CreateTransactionInput,
    ): Promise<Transaction> {
        const entity = buildTransaction(input);
        await this.assertReferences(householdId, entity);
        return this.transactions.createTransaction(entity);
    }

    /** Full replace: every field comes from the input, only the id and (unless upcoming) the recurring link survive. Saving counts as confirming. */
    async update(
        householdId: Id,
        id: Id,
        input: CreateTransactionInput,
    ): Promise<Transaction> {
        const entity = { ...buildTransaction(input), id };
        await this.assertReferences(householdId, entity);
        const updated = await this.transactions.updateTransaction(
            householdId,
            entity,
            this.clock.now(),
        );
        if (!updated) throw new NotFoundError('Transaction', id);
        return updated;
    }

    /** Accepts the amount of a transaction from a varying-amount rule as is. */
    async confirm(householdId: Id, id: Id): Promise<Transaction> {
        const confirmed = await this.transactions.confirmTransaction(
            householdId,
            id,
        );
        if (!confirmed) throw new NotFoundError('Transaction', id);
        return confirmed;
    }

    async delete(householdId: Id, id: Id): Promise<void> {
        if (!(await this.transactions.deleteTransaction(householdId, id))) {
            throw new NotFoundError('Transaction', id);
        }
    }

    private async assertReferences(
        householdId: Id,
        entity: CreateTransaction,
    ): Promise<void> {
        if (
            !(await this.transactions.accountExists(
                householdId,
                entity.accountId,
            ))
        ) {
            throw new NotFoundError('Account', entity.accountId);
        }
        if (
            entity.categoryId &&
            !(await this.transactions.categoryExists(
                householdId,
                entity.categoryId,
            ))
        ) {
            throw new NotFoundError('Category', entity.categoryId);
        }
    }
}

/** Largest first; ties by name, uncategorized last. */
function compareCategoryExpense(
    a: CategoryExpense,
    b: CategoryExpense,
): number {
    if (a.expenses !== b.expenses) return b.expenses - a.expenses;
    if (a.categoryName === null) return b.categoryName === null ? 0 : 1;
    if (b.categoryName === null) return -1;
    return a.categoryName.localeCompare(b.categoryName);
}
