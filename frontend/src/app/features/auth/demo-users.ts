import type { DemoUser } from './auth.types';

/** Seeded by the backend (seed.ts); the login page offers them when GET /api/config says they exist. */
export const DEMO_USERS: readonly DemoUser[] = [
    {
        labelKey: 'auth.login.demoUser',
        email: 'demo@finance.local',
        password: 'demo-password',
    },
    {
        labelKey: 'auth.login.sampleUser',
        email: 'sample@finance.local',
        password: 'sample-password',
    },
];
