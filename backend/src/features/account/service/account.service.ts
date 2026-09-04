import { Inject, Injectable } from '@nestjs/common';
import { AccountRepository } from '../repository/account.repository.js';
import { Account, buildAccount, CreateAccountInput } from '../model/account.js';
import { Id } from '../../../shared/kernel/index.js';

@Injectable()
export class AccountService {
    constructor(@Inject() private readonly accounts: AccountRepository) {}

    async getAll(householdId: Id): Promise<Account[]> {
        return this.accounts.listByHouseholdId(householdId);
    }

    async create(householdId: Id, input: CreateAccountInput): Promise<Account> {
        return this.accounts.createAccount(buildAccount(input), householdId);
    }
}
