import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Account, CreateAccount } from '../model/account.js';
import { Id } from '../../../shared/kernel/index.js';
import { financeAccount } from '../model/account.schema.js';

@Injectable()
export class AccountRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    async listByHouseholdId(householdId: Id): Promise<Account[]> {
        const rows = await this.db
            .select()
            .from(financeAccount)
            .where(eq(financeAccount.householdId, householdId));

        return rows ?? [];
    }

    async createAccount(
        entity: CreateAccount,
        householdId: Id,
    ): Promise<Account> {
        const [row] = await this.db
            .insert(financeAccount)
            .values({
                householdId: householdId,
                ...entity,
            })
            .returning();
        return row;
    }
}
