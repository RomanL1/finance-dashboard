import { Inject, Injectable } from '@nestjs/common';
import { AccountRepository } from '../repository/account.repository.js';
import {
    Account,
    buildAccount,
    buildAccountUpdate,
    CreateAccountInput,
    HouseholdBalance,
    isActiveAccount,
    UpdateAccountInput,
} from '../model/account.js';
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
export class AccountService {
    constructor(
        @Inject() private readonly accounts: AccountRepository,
        private readonly households: HouseholdService,
        private readonly exchangeRates: ExchangeRateService,
    ) {}

    async getAll(householdId: Id): Promise<Account[]> {
        return this.accounts.listByHouseholdId(householdId);
    }

    /**
     * Active accounts only, matching what the overview shows. Every balance converts at the newest
     * mirrored rate, so the total is a snapshot of now, not a sum of per-day conversions like the
     * period stats: the period net and the change of this total need not agree.
     */
    async getHouseholdBalance(householdId: Id): Promise<HouseholdBalance> {
        const household = await this.households.getById(householdId);
        const accounts = await this.accounts.listByHouseholdId(householdId);
        const converter = await this.exchangeRates.latestConverter(
            household.baseCurrency,
        );
        const now = new Date();
        let amount = 0;
        for (const account of accounts) {
            if (!isActiveAccount(account, now)) continue;
            amount += converter.toBase(
                account.amount,
                asSupportedCurrency(account.currency),
                now,
            );
        }
        return { currency: household.baseCurrency, amount };
    }

    async create(householdId: Id, input: CreateAccountInput): Promise<Account> {
        return this.accounts.createAccount(buildAccount(input), householdId);
    }

    /** Full replace, id and initial value survive. */
    async update(
        householdId: Id,
        id: Id,
        input: UpdateAccountInput,
    ): Promise<Account> {
        const updated = await this.accounts.updateAccount(householdId, {
            ...buildAccountUpdate(input),
            id,
        });
        if (!updated) throw new NotFoundError('Account', id);
        return updated;
    }

    /** Every transaction of the account goes with it (explicit delete, FK is restrict). */
    async delete(householdId: Id, id: Id): Promise<void> {
        if (!(await this.accounts.deleteAccount(householdId, id))) {
            throw new NotFoundError('Account', id);
        }
    }
}

function asSupportedCurrency(value: string): SupportedCurrency {
    if (!SUPPORTED_CURRENCIES.includes(value as SupportedCurrency)) {
        throw new ValidationError(`Unsupported currency ${value}`);
    }
    return value as SupportedCurrency;
}
