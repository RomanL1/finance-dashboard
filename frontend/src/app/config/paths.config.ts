export const APP_PATHS = {
    LOGIN: 'login',
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
