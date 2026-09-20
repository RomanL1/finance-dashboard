import type {
    AccountDto,
    CreateAccountDto,
    UpdateAccountDto,
} from '../../core/api';

export type { AccountDto, CreateAccountDto, UpdateAccountDto };

export type AccountType = AccountDto['type'];

/** Picker order. Labels live under `account.type.<value>`. */
export const ACCOUNT_TYPES: readonly AccountType[] = [
    'checking',
    'savings',
    'cash',
    'credit_card',
    'other',
];

/** What the account dialog needs from its opener. `account` set = edit mode. */
export interface AccountDialogData {
    householdId: string;
    /** Household currency; every account uses it. */
    currency: string;
    account?: AccountDto;
}

/** Active = not archived, or archived at a date still in the future. */
export function isActiveAccount(account: AccountDto, at = new Date()): boolean {
    return account.archivedAt == null || new Date(account.archivedAt) > at;
}
