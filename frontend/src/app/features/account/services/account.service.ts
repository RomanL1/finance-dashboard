import { Injectable } from '@angular/core';
import { accountCreateAccount, accountGetAccounts } from '../../../core/api';
import type { AccountDto, CreateAccountDto } from '../account.types';

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
}
