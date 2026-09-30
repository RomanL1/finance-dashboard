export const APP_PATHS = {
    LOGIN: 'login',
    SIGNUP: 'signup',
    CHECK_EMAIL: 'check-email',
    /** Paths below receive the links from the backend's mails (auth.ts AUTH_LINKS). */
    VERIFY_EMAIL: 'verify-email',
    FORGOT_PASSWORD: 'forgot-password',
    RESET_PASSWORD: 'reset-password',
    HOME: '',
    ONBOARDING: 'onboarding',
    TRANSACTIONS: 'transactions',
    ANALYTICS: 'analytics',
    SETTINGS: 'settings',
    /** Invitation links point here: `/invite/<token>`. */
    INVITE: 'invite',
} as const;

/** Subpages under `settings`, relative to it. */
export const SETTINGS_PATHS = {
    MEMBERS: 'members',
} as const;

/** `/onboarding?new=1`: a user who already has a household creates another one. */
export const NEW_HOUSEHOLD_PARAM = 'new';

/** Tabs under `transactions`, relative to it. */
export const TRANSACTION_PATHS = {
    HISTORY: 'history',
    RECURRING: 'recurring',
} as const;

/** Tabs under `analytics`, relative to it. */
export const ANALYTICS_PATHS = {
    CATEGORIES: 'categories',
    BUDGETS: 'budgets',
} as const;

/** `?invite=<token>` on the auth pages: the visitor came from an invitation link and returns to it. */
export const INVITE_PARAM = 'invite';
