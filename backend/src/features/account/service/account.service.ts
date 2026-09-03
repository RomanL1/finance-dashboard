import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AccountRepository } from '../repository/account.repository.js';
import { Account, CreateAccount } from '../model/account.js';
import { Id, newId, ValidationError } from '../../../shared/kernel/index.js';
import { HouseholdService } from '../../household/service/household.service.js';

export interface CreateAccountInput {
    description: string;
    currency?: string;
    initialValue: number;
    startDate: Date;
}

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

    async create(
        householdId: Id,
        input: CreateAccountInput,
    ): Promise<Account> {
        const description = input.description?.trim();
        if (!description) {
            throw new ValidationError('Account description cannot be empty');
        }

        const currency =
            input.currency ??
            (await this.households.getById(householdId)).currency;

        const entity: CreateAccount = {
            id: newId(),
            description,
            currency,
            initialValue: input.initialValue,
            amount: input.initialValue,
            startDate: input.startDate,
        };

        return this.accounts.createAccount(entity, householdId);
    }

    /** Onboarding cannot complete with zero accounts, regardless of what the client sent. */
    async assertHasAccounts(householdId: Id): Promise<void> {
        const existing = await this.accounts.listByHouseholdId(householdId);
        if (existing.length === 0) {
            throw new ValidationError('At least one account must be added');
        }
    }
}
