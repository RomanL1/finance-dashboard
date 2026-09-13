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
    Transaction,
} from '../model/transaction.js';
import {
    Id,
    NotFoundError,
    SUPPORTED_CURRENCIES,
    ValidationError,
    type SupportedCurrency,
} from '../../../shared/kernel/index.js';
import { HouseholdService } from '../../household/service/household.service.js';
import { ExchangeRateService } from '../../exchange-rate/service/exchange-rate.service.js';

@Injectable()
export class TransactionService {
    constructor(
        @Inject() private readonly transactions: TransactionRepository,
        private readonly households: HouseholdService,
        private readonly exchangeRates: ExchangeRateService,
    ) {}

    async getAll(householdId: Id): Promise<Transaction[]> {
        return this.transactions.listByHouseholdId(householdId);
    }

    /** Income / expenses / net in the household base currency, each day converted at its own rate. Future-dated entries inside the range count. */
    async getStats(householdId: Id, range: DateRange): Promise<CurrencyStats> {
        assertValidRange(range);
        const household = await this.households.getById(householdId);
        const rows = await this.transactions.sumByCurrencyAndDay(
            householdId,
            range,
        );
        const converter = await this.exchangeRates.converter(
            household.baseCurrency,
            range.from,
            range.to,
        );
        let income = 0;
        let expenses = 0;
        for (const row of rows) {
            const currency = asSupportedCurrency(row.currency);
            const date = new Date(`${row.day}T00:00:00.000Z`);
            income += converter.toBase(row.income, currency, date);
            expenses += converter.toBase(row.expenses, currency, date);
        }
        return {
            currency: household.baseCurrency,
            income,
            expenses,
            net: income - expenses,
        };
    }

    /** Expenses per category, converted into the household base currency at each day's rate. */
    async getCategoryStats(
        householdId: Id,
        range: DateRange,
    ): Promise<CategoryStats> {
        assertValidRange(range);
        const household = await this.households.getById(householdId);
        const rows = await this.transactions.sumExpensesByCategoryAndDay(
            householdId,
            range,
        );
        const converter = await this.exchangeRates.converter(
            household.baseCurrency,
            range.from,
            range.to,
        );

        const byCategory = new Map<Id | null, CategoryExpense>();
        for (const row of rows) {
            const converted = converter.toBase(
                row.expenses,
                asSupportedCurrency(row.currency),
                new Date(`${row.day}T00:00:00.000Z`),
            );
            const entry = byCategory.get(row.categoryId) ?? {
                categoryId: row.categoryId,
                categoryName: row.categoryName,
                expenses: 0,
            };
            entry.expenses += converted;
            byCategory.set(row.categoryId, entry);
        }
        return {
            currency: household.baseCurrency,
            categories: [...byCategory.values()].sort(compareCategoryExpense),
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

    /** Full replace: every field comes from the input, only the id survives. */
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
        );
        if (!updated) throw new NotFoundError('Transaction', id);
        return updated;
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

function asSupportedCurrency(value: string): SupportedCurrency {
    if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(value)) {
        throw new ValidationError(`Unsupported account currency ${value}`);
    }
    return value as SupportedCurrency;
}
