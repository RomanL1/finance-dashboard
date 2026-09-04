import type {
    AccountDto,
    CreateAccountDto,
    UpdateAccountDto,
} from '../../core/api';

export type { AccountDto, CreateAccountDto, UpdateAccountDto };

/** What the account dialog needs from its opener. `account` set = edit mode. */
export interface AccountDialogData {
    householdId: string;
    account?: AccountDto;
}

/** Active = not archived, or archived at a date still in the future. */
export function isActiveAccount(account: AccountDto, at = new Date()): boolean {
    return account.archivedAt == null || new Date(account.archivedAt) > at;
}
