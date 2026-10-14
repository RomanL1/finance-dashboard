import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, or } from 'drizzle-orm';
import {
    CreateTransfer,
    Transfer,
    TransferAccount,
    TransferFilter,
} from '../model/transfer.js';
import { Id } from '../../../shared/kernel/index.js';
import { transfer } from '../model/transfer.schema.js';
import { financeAccount } from '../../account/model/account.schema.js';

@Injectable()
export class TransferRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    private readonly columns = {
        id: transfer.id,
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        amount: transfer.amount,
        title: transfer.title,
        date: transfer.date,
        createdAt: transfer.createdAt,
    };

    /** Both accounts belong to the household; scopes every query and mutation. */
    private inHousehold(householdId: Id) {
        const accounts = this.db
            .select({ id: financeAccount.id })
            .from(financeAccount)
            .where(eq(financeAccount.householdId, householdId));
        return and(
            inArray(transfer.fromAccountId, accounts),
            inArray(transfer.toAccountId, accounts),
        );
    }

    private matching(householdId: Id, filter: TransferFilter) {
        return and(
            this.inHousehold(householdId),
            filter.accountId
                ? or(
                      eq(transfer.fromAccountId, filter.accountId),
                      eq(transfer.toAccountId, filter.accountId),
                  )
                : undefined,
        );
    }

    /** Newest first; `createdAt` breaks ties so pages never overlap. */
    async listByHouseholdId(
        householdId: Id,
        filter: TransferFilter,
        limit: number,
        offset: number,
    ): Promise<Transfer[]> {
        return this.db
            .select(this.columns)
            .from(transfer)
            .where(this.matching(householdId, filter))
            .orderBy(desc(transfer.date), desc(transfer.createdAt))
            .limit(limit)
            .offset(offset);
    }

    async countByHouseholdId(
        householdId: Id,
        filter: TransferFilter,
    ): Promise<number> {
        const [row] = await this.db
            .select({ total: count() })
            .from(transfer)
            .where(this.matching(householdId, filter));
        return row?.total ?? 0;
    }

    /** Only those of the requested accounts that belong to the household. */
    async findAccounts(householdId: Id, ids: Id[]): Promise<TransferAccount[]> {
        return this.db
            .select({
                id: financeAccount.id,
                archivedAt: financeAccount.archivedAt,
            })
            .from(financeAccount)
            .where(
                and(
                    inArray(financeAccount.id, ids),
                    eq(financeAccount.householdId, householdId),
                ),
            );
    }

    async createTransfer(entity: CreateTransfer): Promise<Transfer> {
        const [row] = await this.db.insert(transfer).values(entity).returning();
        return row;
    }

    /** Null when the row does not exist or belongs to another household. */
    async updateTransfer(
        householdId: Id,
        entity: CreateTransfer,
    ): Promise<Transfer | null> {
        const [row] = await this.db
            .update(transfer)
            .set(entity)
            .where(
                and(eq(transfer.id, entity.id), this.inHousehold(householdId)),
            )
            .returning();
        return row ?? null;
    }

    async deleteTransfer(householdId: Id, id: Id): Promise<boolean> {
        const deleted = await this.db
            .delete(transfer)
            .where(and(eq(transfer.id, id), this.inHousehold(householdId)))
            .returning({ id: transfer.id });
        return deleted.length > 0;
    }
}
