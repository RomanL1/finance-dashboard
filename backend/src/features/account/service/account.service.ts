import { Inject, Injectable } from '@nestjs/common';
import { AccountRepository } from '../repository/account.repository.js';
import {
    Account,
    buildAccount,
    buildAccountUpdate,
    CreateAccountInput,
    UpdateAccountInput,
} from '../model/account.js';
import { Id, NotFoundError } from '../../../shared/kernel/index.js';

@Injectable()
export class AccountService {
    constructor(@Inject() private readonly accounts: AccountRepository) {}

    async getAll(householdId: Id): Promise<Account[]> {
        return this.accounts.listByHouseholdId(householdId);
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
