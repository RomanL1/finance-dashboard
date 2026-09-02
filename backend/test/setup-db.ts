import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from '../src/shared/infra/db/db.js';
import { seed } from '../src/shared/infra/db/seed.js';

/** e2e runs against an in-memory sqlite (see vitest.config.e2e.ts): migrate + seed once per run. */
export async function prepareTestDb(): Promise<void> {
    await migrate(db, { migrationsFolder: './drizzle' });
    await seed();
}
