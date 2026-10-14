import { formatDate } from '@angular/common';
import type {
    AccountDto,
    CreateTransferDto,
    TransferDto,
    TransferPageDto,
} from '../../core/api';

export type { CreateTransferDto, TransferDto, TransferPageDto };

/** Prefilled form values. Unknown or inactive account ids are ignored. */
export type TransferDefaults = Partial<CreateTransferDto>;

/** What the transfer dialog needs from its opener. `transfer` set = edit mode; `settle` = paying off a credit card. */
export interface TransferDialogData {
    householdId: string;
    transfer?: TransferDto;
    defaults?: TransferDefaults;
    settle?: boolean;
}

/** Flattened for display: account ids resolved to badge numbers and names. */
export interface TransferRow {
    id: string;
    /** ISO timestamp, kept for `<time datetime>`. */
    date: string;
    when: string;
    title: string | null;
    fromNumber: number;
    fromName: string;
    toNumber: number;
    toName: string;
    currency: string;
    /** Minor units, positive. */
    amount: number;
}

export function toTransferRows(
    transfers: TransferDto[],
    accounts: AccountDto[],
    locale: string,
): TransferRow[] {
    const byId = new Map(accounts.map((a) => [a.id, a]));
    return transfers.map((t) => {
        const from = byId.get(t.fromAccountId);
        const to = byId.get(t.toAccountId);
        return {
            id: t.id,
            date: t.date,
            when: formatDate(t.date, 'dd.MM.yy HH:mm', locale),
            title: t.title,
            fromNumber: from?.number ?? 0,
            fromName: from?.description ?? '',
            toNumber: to?.number ?? 0,
            toName: to?.description ?? '',
            currency: from?.currency ?? to?.currency ?? '',
            amount: t.amount,
        };
    });
}

/**
 * Prefill for settling `card`: its whole debt goes to it. The payer is left to the dialog (last
 * payer). The balance includes this month's upcoming bookings; the user can lower the amount.
 */
export function settleDefaults(card: AccountDto): TransferDefaults {
    return { toAccountId: card.id, amount: Math.max(0, -card.amount) };
}
