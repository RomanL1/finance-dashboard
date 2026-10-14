import { Injectable } from '@angular/core';
import {
    transferCreateTransfer,
    transferDeleteTransfer,
    transferGetTransfers,
    transferUpdateTransfer,
} from '../../../core/api';
import type {
    CreateTransferDto,
    TransferDto,
    TransferPageDto,
} from '../transfer.types';

const LAST_PAYER_KEY = 'transfer-last-payer';

@Injectable({ providedIn: 'root' })
export class TransferService {
    /** `pageSize` omitted = server default. */
    async list(
        householdId: string,
        page: number,
        pageSize?: number,
    ): Promise<TransferPageDto> {
        const response = await transferGetTransfers({
            path: { householdId },
            query: { page, pageSize },
            throwOnError: true,
        });
        return response.data;
    }

    async create(
        householdId: string,
        body: CreateTransferDto,
    ): Promise<TransferDto> {
        const response = await transferCreateTransfer({
            path: { householdId },
            body,
            throwOnError: true,
        });
        this.rememberPayer(body.fromAccountId);
        return response.data;
    }

    async update(
        householdId: string,
        transferId: string,
        body: CreateTransferDto,
    ): Promise<TransferDto> {
        const response = await transferUpdateTransfer({
            path: { householdId, transferId },
            body,
            throwOnError: true,
        });
        return response.data;
    }

    async delete(householdId: string, transferId: string): Promise<void> {
        await transferDeleteTransfer({
            path: { householdId, transferId },
            throwOnError: true,
        });
    }

    /** Account that paid the last new transfer, so settling the card again is one tap shorter. */
    lastPayer(): string | undefined {
        try {
            return localStorage.getItem(LAST_PAYER_KEY) ?? undefined;
        } catch {
            return undefined;
        }
    }

    private rememberPayer(accountId: string): void {
        try {
            localStorage.setItem(LAST_PAYER_KEY, accountId);
        } catch {
            /* localStorage unavailable (private mode) — no preselect next time */
        }
    }
}
