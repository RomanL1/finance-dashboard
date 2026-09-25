/**
 * Dev seed. Two users for signing in (story M1; its simulated login is now a better-auth session):
 * - demo: deliberately has no household, so logging in always lands on onboarding
 *   from a clean, fully-incomplete state.
 * - sample: fully set up household with accounts, categories, monthly budgets and 200 random transactions.
 * Idempotent. Run with `bun run db:seed`.
 */
import { eq, inArray } from 'drizzle-orm';
import { newId } from '../../kernel/index.js';
import { auth } from '../auth/auth.js';
import { db } from './db.js';
import {
    budget,
    budgetMonth,
    category,
    financeAccount,
    household,
    householdMember,
    transaction,
    user,
} from './schema.js';

export const DEMO_USER = {
    email: 'demo@finance.local',
    password: 'demo-password',
    name: 'Demo User',
} as const;

export const SAMPLE_USER = {
    email: 'sample@finance.local',
    password: 'sample-password',
    name: 'Sample User',
} as const;

const SAMPLE_TRANSACTION_COUNT = 200;
const SAMPLE_MONTHS = 6;

/** Expense categories with a plausible amount range in major units. */
const SAMPLE_CATEGORIES = {
    Housing: [1800, 1800],
    Groceries: [15, 180],
    Restaurants: [20, 120],
    Transport: [5, 90],
    Leisure: [10, 150],
    Health: [20, 300],
    Shopping: [15, 250],
    Miscellaneous: [5, 80],
    Salary: [6500, 6500],
} as const satisfies Record<string, readonly [number, number]>;

type SampleCategory = keyof typeof SAMPLE_CATEGORIES;

/** Monthly limits in major units. Some sit below typical spending, so over-budget shows up too. Transport stays unbudgeted. */
const SAMPLE_BUDGETS: Partial<Record<SampleCategory, number>> = {
    Housing: 1800,
    Groceries: 400,
    Restaurants: 250,
    Leisure: 300,
    Health: 200,
    Shopping: 450,
    Miscellaneous: 150,
};

const EXPENSE_CATEGORIES = (
    Object.keys(SAMPLE_CATEGORIES) as SampleCategory[]
).filter((name) => name !== 'Housing' && name !== 'Salary');

const TITLES: Partial<Record<SampleCategory, string[]>> = {
    Groceries: ['Migros', 'Coop', 'Aldi', 'Lidl', 'Bakery'],
    Restaurants: ['Pizzeria', 'Sushi bar', 'Lunch', 'Café', 'Take-away'],
    Transport: ['SBB ticket', 'Fuel', 'Parking', 'Bike repair'],
    Leisure: ['Cinema', 'Concert', 'Gym', 'Books', 'Streaming'],
    Health: ['Pharmacy', 'Dentist', 'Doctor'],
    Shopping: ['Clothes', 'Electronics', 'Household goods', 'Gift'],
    Miscellaneous: ['Post office', 'Hairdresser', 'Donation'],
};

async function ensureUser(
    credentials: typeof DEMO_USER | typeof SAMPLE_USER,
): Promise<typeof user.$inferSelect> {
    const byEmail = () =>
        db.select().from(user).where(eq(user.email, credentials.email));
    let [existing] = await byEmail();
    if (!existing) {
        await auth.api.signUpEmail({ body: { ...credentials } });
        [existing] = await byEmail();
        console.log(`created user ${credentials.email}`);
    }
    return existing!;
}

/** Creates the demo user if missing and leaves everything else untouched. Used on boot (SEED_DEMO=true). */
export function ensureDemoUser(): Promise<typeof user.$inferSelect> {
    return ensureUser(DEMO_USER);
}

/** Creates the sample user and its household if missing; never touches an existing household. Used on boot (SEED_DEMO=true). */
export async function ensureSampleUser(): Promise<void> {
    const sampleUser = await ensureUser(SAMPLE_USER);
    if (!(await householdIdOf(sampleUser.id))) {
        await insertSampleHousehold(sampleUser.id);
    }
}

async function householdIdOf(userId: string): Promise<string | undefined> {
    const [membership] = await db
        .select()
        .from(householdMember)
        .where(eq(householdMember.userId, userId));
    return membership?.householdId;
}

/** Deletes a household. Transactions restrict account deletion, so they go first. */
async function deleteHousehold(householdId: string): Promise<void> {
    const accountIds = db
        .select({ id: financeAccount.id })
        .from(financeAccount)
        .where(eq(financeAccount.householdId, householdId));
    await db
        .delete(transaction)
        .where(inArray(transaction.accountId, accountIds));
    await db.delete(household).where(eq(household.id, householdId));
}

function randomInt(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)]!;
}

async function insertSampleHousehold(userId: string): Promise<void> {
    const householdId = newId();
    const now = new Date();
    const start = new Date(
        now.getFullYear(),
        now.getMonth() - SAMPLE_MONTHS,
        1,
    );

    const categoryIds = Object.fromEntries(
        Object.keys(SAMPLE_CATEGORIES).map((name) => [name, newId()]),
    ) as Record<SampleCategory, string>;
    const accounts = [
        {
            id: newId(),
            description: 'Checking',
            type: 'checking',
            initialValue: 350_000,
        },
        {
            id: newId(),
            description: 'Savings',
            type: 'savings',
            initialValue: 1_200_000,
        },
        {
            id: newId(),
            description: 'Credit card',
            type: 'credit_card',
            initialValue: 0,
        },
        {
            id: newId(),
            description: 'Wallet',
            type: 'cash',
            initialValue: 20_000,
        },
    ] as const;
    const [checking, , creditCard] = accounts;

    type NewTransaction = typeof transaction.$inferInsert;
    const transactions: NewTransaction[] = [];
    const entry = (
        name: SampleCategory,
        date: Date,
        accountId: string,
        type: NewTransaction['type'] = 'expense',
    ) => {
        const [min, max] = SAMPLE_CATEGORIES[name];
        transactions.push({
            id: newId(),
            accountId,
            categoryId: categoryIds[name],
            type,
            amount: randomInt(min * 100, max * 100),
            title: TITLES[name] ? pick(TITLES[name]) : name,
            date,
        });
    };

    // Recurring: rent on the 1st, salary on the 25th of every month up to now.
    for (let m = 0; m <= SAMPLE_MONTHS; m++) {
        const month = new Date(start.getFullYear(), start.getMonth() + m, 1);
        entry('Housing', month, checking.id);
        const payday = new Date(month.getFullYear(), month.getMonth(), 25);
        if (payday <= now) entry('Salary', payday, checking.id, 'income');
    }
    // Everything else: random day between the start and now.
    while (transactions.length < SAMPLE_TRANSACTION_COUNT) {
        const date = new Date(randomInt(start.getTime(), now.getTime()));
        entry(pick(EXPENSE_CATEGORIES), date, pick([checking, creditCard]).id);
    }

    // Limits for every seeded month up to the current one, each marked as touched.
    // Next month stays untouched, so it takes over the current month's limits on first view.
    const budgetMonths = Array.from({ length: SAMPLE_MONTHS + 1 }, (_, m) => {
        const month = new Date(start.getFullYear(), start.getMonth() + m, 1);
        return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    });
    const budgets = budgetMonths.flatMap((month) =>
        Object.entries(SAMPLE_BUDGETS).map(([name, amount]) => ({
            id: newId(),
            categoryId: categoryIds[name as SampleCategory],
            month,
            amount: amount * 100,
        })),
    );

    // Keep batch: explicit transactions lose libsql's :memory: e2e DB (ADR-3).
    await db.batch([
        db.insert(household).values({
            id: householdId,
            name: 'Sample household',
            onboardingComplete: true,
            baseCurrency: 'CHF',
        }),
        db
            .insert(householdMember)
            .values({ householdId, userId, role: 'owner' }),
        db.insert(category).values(
            Object.entries(categoryIds).map(([name, id]) => ({
                id,
                householdId,
                name,
            })),
        ),
        db.insert(financeAccount).values(
            accounts.map((account, i) => ({
                ...account,
                householdId,
                number: i + 1,
                currency: 'CHF',
                startDate: start,
            })),
        ),
        db.insert(transaction).values(transactions),
        db.insert(budget).values(budgets),
        db
            .insert(budgetMonth)
            .values(budgetMonths.map((month) => ({ householdId, month }))),
    ]);
}

export async function seed(): Promise<void> {
    // Drop any household from a previous seed run so the demo user is
    // always in a fresh, pre-onboarding state. Cascades to householdMember.
    const demoUser = await ensureDemoUser();
    const demoHouseholdId = await householdIdOf(demoUser.id);
    if (demoHouseholdId) await deleteHousehold(demoHouseholdId);

    // Rebuild the sample household with fresh random transactions.
    const sampleUser = await ensureUser(SAMPLE_USER);
    const sampleHouseholdId = await householdIdOf(sampleUser.id);
    if (sampleHouseholdId) await deleteHousehold(sampleHouseholdId);
    await insertSampleHousehold(sampleUser.id);

    console.log(
        `seeded: ${DEMO_USER.email} / ${DEMO_USER.password} → no household (onboarding incomplete)`,
    );
    console.log(
        `seeded: ${SAMPLE_USER.email} / ${SAMPLE_USER.password} → household with ${SAMPLE_TRANSACTION_COUNT} transactions and budgets`,
    );
}

if (import.meta.main) {
    await seed();
}
