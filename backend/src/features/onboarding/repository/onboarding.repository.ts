import { Inject, Injectable } from '@nestjs/common';
import type { BatchItem } from 'drizzle-orm/batch';
import { DRIZZLE } from '../../../shared/infra/db/db.module.js';
import type { Db } from '../../../shared/infra/db/db.js';
import type { Id } from '../../../shared/kernel/index.js';
import {
    household,
    householdMember,
} from '../../household/model/household.schema.js';
import { category } from '../../category/model/category.schema.js';
import { financeAccount } from '../../account/model/account.schema.js';
import type { Household } from '../../household/model/household.js';
import type { CreateOrUpdateCategory } from '../../category/model/category.js';
import type { CreateAccount } from '../../account/model/account.js';

export interface NewHousehold {
    household: Household;
    ownerUserId: Id;
    categories: CreateOrUpdateCategory[];
    accounts: CreateAccount[];
}

/**
 * Onboarding is the one write that spans household, category and account tables,
 * so it owns a repository that persists all of them in a single batch — libsql runs
 * a batch inside one transaction and rolls the whole thing back if any statement fails.
 */
@Injectable()
export class OnboardingRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Db) {}

    async insertHousehold(input: NewHousehold): Promise<void> {
        const householdId = input.household.id;

        const statements: [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]] = [
            this.db.insert(household).values(input.household),
            this.db.insert(householdMember).values({
                householdId,
                userId: input.ownerUserId,
                role: 'owner',
            }),
            ...input.categories.map((entity) =>
                this.db.insert(category).values({ householdId, ...entity }),
            ),
            ...input.accounts.map((entity) =>
                this.db
                    .insert(financeAccount)
                    .values({ householdId, ...entity }),
            ),
        ];

        await this.db.batch(statements);
    }
}
