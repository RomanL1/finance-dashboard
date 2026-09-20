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

    /** False when the server refuses because the account has transactions (story M16). */
    async delete(householdId: string, accountId: string): Promise<boolean> {
        const { error, response } = await accountDeleteAccount({
            path: { householdId, accountId },
        });
        if (response?.status === 409) return false;
        if (error !== undefined) throw error;
        return true;
    }
}
