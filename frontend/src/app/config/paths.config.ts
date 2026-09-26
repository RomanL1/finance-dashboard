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
} as const;

/** Tabs under `analytics`, relative to it. */
export const ANALYTICS_PATHS = {
    CATEGORIES: 'categories',
    BUDGETS: 'budgets',
} as const;
