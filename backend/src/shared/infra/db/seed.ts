/**
 * Dev seed: creates the demo user + household used for the simulated login (user story M1).
 * Idempotent. Run with `bun run db:seed`.
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

export const DEMO_HOUSEHOLD = {
    id: 'demo-household',
    name: 'Demo Haushalt',
    currency: 'CHF',
} as const;

export async function seed(): Promise<void> {
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

    await db.insert(household).values(DEMO_HOUSEHOLD).onConflictDoNothing();
    await db
        .insert(householdMember)
        .values({
            householdId: DEMO_HOUSEHOLD.id,
            userId: demoUser!.id,
            role: 'owner',
        })
        .onConflictDoNothing();
    console.log(
        `seeded: ${DEMO_USER.email} / ${DEMO_USER.password} → household "${DEMO_HOUSEHOLD.name}"`,
    );
}

if (import.meta.main) {
    await seed();
}
