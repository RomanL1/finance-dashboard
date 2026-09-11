/**
 * Dev seed: creates the demo user used for the simulated login (user story M1).
 * Deliberately has no household — logging in as this user always lands on
 * onboarding, from a clean, fully-incomplete state. Idempotent. Run with `bun run db:seed`.
 */
import { eq } from 'drizzle-orm';
import { auth } from '../auth/auth.js';
import { db } from './db.js';
import { household, householdMember, user } from './schema.js';

export const DEMO_USER = {
    email: 'demo@finance.local',
    password: 'demo-password',
    name: 'Demo User',
} as const;

/** Creates the demo user if missing and leaves everything else untouched. Used on boot (SEED_DEMO=true). */
export async function ensureDemoUser(): Promise<typeof user.$inferSelect> {
    let [demoUser] = await db
        .select()
        .from(user)
        .where(eq(user.email, DEMO_USER.email));
    if (!demoUser) {
        await auth.api.signUpEmail({ body: { ...DEMO_USER } });
        [demoUser] = await db
            .select()
            .from(user)
            .where(eq(user.email, DEMO_USER.email));
        console.log(`created user ${DEMO_USER.email}`);
    }
    return demoUser!;
}

export async function seed(): Promise<void> {
    const demoUser = await ensureDemoUser();

    // Drop any household from a previous seed run so the demo user is
    // always in a fresh, pre-onboarding state. Cascades to householdMember.
    const [membership] = await db
        .select()
        .from(householdMember)
        .where(eq(householdMember.userId, demoUser.id));
    if (membership) {
        await db
            .delete(household)
            .where(eq(household.id, membership.householdId));
    }

    console.log(
        `seeded: ${DEMO_USER.email} / ${DEMO_USER.password} → no household (onboarding incomplete)`,
    );
}

if (import.meta.main) {
    await seed();
}
