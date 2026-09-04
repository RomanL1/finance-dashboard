import { Injectable } from '@angular/core';
import {
    accountCreateAccount,
    accountDeleteAccount,
    accountGetAccounts,
    accountUpdateAccount,
} from '../../../core/api';
import type {
    AccountDto,
    CreateAccountDto,
    UpdateAccountDto,
} from '../account.types';

@Injectable({ providedIn: 'root' })
export class AccountService {
    async list(householdId: string): Promise<AccountDto[]> {
        const response = await accountGetAccounts({
            path: { householdId },
            throwOnError: true,
        });
        return response.data;
    }

    async create(
        householdId: string,
        body: CreateAccountDto,
    ): Promise<AccountDto> {
        const response = await accountCreateAccount({
            path: { householdId },
            body,
            throwOnError: true,
        });
        return response.data;
    }

    async update(
        householdId: string,
        accountId: string,
        body: UpdateAccountDto,
    ): Promise<AccountDto> {
        const response = await accountUpdateAccount({
            path: { householdId, accountId },
            body,
            throwOnError: true,
        });
        return response.data;
    }

    /** Deletes the account and all of its transactions. */
    async delete(householdId: string, accountId: string): Promise<void> {
        await accountDeleteAccount({
            path: { householdId, accountId },
            throwOnError: true,
        });
    }
}
