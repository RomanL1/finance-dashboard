import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AccountRepository } from '../repository/account.repository.js';
import { Account, buildAccount, CreateAccountInput } from '../model/account.js';
import { Id } from '../../../shared/kernel/index.js';
import { HouseholdService } from '../../household/service/household.service.js';

@Injectable()
export class AccountService {
    constructor(
        @Inject() private readonly accounts: AccountRepository,
        @Inject(forwardRef(() => HouseholdService))
        private readonly households: HouseholdService,
    ) {}

    async getAll(householdId: Id): Promise<Account[]> {
        return this.accounts.listByHouseholdId(householdId);
    }

    async create(householdId: Id, input: CreateAccountInput): Promise<Account> {
        /** Only look the household up when the caller left the currency open. */
        const householdCurrency =
            input.currency ??
            (await this.households.getById(householdId)).currency;
        const entity = buildAccount(input, householdCurrency);
        return this.accounts.createAccount(entity, householdId);
    }
}
