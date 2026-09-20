import { Inject, Injectable } from '@nestjs/common';
import { AccountRepository } from '../repository/account.repository.js';
import {
    Account,
    buildAccount,
    buildAccountUpdate,
    CreateAccountInput,
    UpdateAccountInput,
} from '../model/account.js';
import {
    ConflictError,
    Id,
    NotFoundError,
    ValidationError,
} from '../../../shared/kernel/index.js';
import { HouseholdService } from '../../household/service/household.service.js';

@Injectable()
export class AccountService {
    constructor(
        @Inject() private readonly accounts: AccountRepository,
        private readonly households: HouseholdService,
    ) {}

    async getAll(householdId: Id): Promise<Account[]> {
        return this.accounts.listByHouseholdId(householdId);
    }

    async create(householdId: Id, input: CreateAccountInput): Promise<Account> {
        await this.assertHouseholdCurrency(householdId, input.currency);
        return this.accounts.createAccount(buildAccount(input), householdId);
    }

    /** Full replace, id and initial value survive. */
    async update(
        householdId: Id,
        id: Id,
        input: UpdateAccountInput,
    ): Promise<Account> {
        await this.assertHouseholdCurrency(householdId, input.currency);
        const updated = await this.accounts.updateAccount(householdId, {
            ...buildAccountUpdate(input),
            id,
        });
        if (!updated) throw new NotFoundError('Account', id);
        return updated;
    }

    /** One currency per household: the account field is kept on the wire but must equal it. */
    private async assertHouseholdCurrency(
        householdId: Id,
        currency: string,
    ): Promise<void> {
        const household = await this.households.getById(householdId);
        if (currency !== household.baseCurrency) {
            throw new ValidationError(
                `Account currency must be the household currency ${household.baseCurrency}`,
            );
        }
    }

    /** Only an account without transactions can go; one with history is archived instead (story M16). */
    async delete(householdId: Id, id: Id): Promise<void> {
        if (await this.accounts.hasTransactions(householdId, id)) {
            throw new ConflictError(
                'Account has transactions, archive it instead',
            );
        }
        if (!(await this.accounts.deleteAccount(householdId, id))) {
            throw new NotFoundError('Account', id);
        }
    }
}
