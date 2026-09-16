import { Routes } from '@angular/router';
import { AuthGuard } from '../core/auth/auth.guard';
import {
    OnboardingCompleteGuard,
    OnboardingGuard,
} from '../features/household/services/onboarding.guard';
import { ANALYTICS_PATHS, APP_PATHS } from './paths.config';

export const routes: Routes = [
    {
        path: APP_PATHS.LOGIN,
        loadComponent: () =>
            import('../features/auth/pages/login.page').then(
                (m) => m.LoginPage,
            ),
    },
    {
        path: APP_PATHS.ONBOARDING,
        canActivate: [AuthGuard, OnboardingCompleteGuard],
        loadComponent: () =>
            import('../features/onboarding/pages/onboarding.page').then(
                (m) => m.OnboardingPage,
            ),
    },
    {
        /** Layout route: tab bar + outlet. Guards run once for every tab. */
        path: APP_PATHS.HOME,
        canActivate: [AuthGuard, OnboardingGuard],
        loadComponent: () =>
            import('../features/shell/pages/shell.page').then(
                (m) => m.ShellPage,
            ),
        children: [
            {
                path: APP_PATHS.HOME,
                loadComponent: () =>
                    import('../features/household/pages/home.page').then(
                        (m) => m.HomePage,
                    ),
            },
            {
                path: APP_PATHS.TRANSACTIONS,
                loadComponent: () =>
                    import('../features/transaction/pages/transactions.page').then(
                        (m) => m.TransactionsPage,
                    ),
            },
            {
                /** Layout route: analytics tab row + outlet; both tabs share the `?period&start` params. */
                path: APP_PATHS.ANALYTICS,
                loadComponent: () =>
                    import('../features/analytics/pages/analytics.page').then(
                        (m) => m.AnalyticsPage,
                    ),
                children: [
                    {
                        path: '',
                        pathMatch: 'full',
                        redirectTo: ANALYTICS_PATHS.CATEGORIES,
                    },
                    {
                        path: ANALYTICS_PATHS.CATEGORIES,
                        loadComponent: () =>
                            import('../features/analytics/pages/category-stats.page').then(
                                (m) => m.CategoryStatsPage,
                            ),
                    },
                    {
                        path: ANALYTICS_PATHS.BUDGETS,
                        loadComponent: () =>
                            import('../features/budget/pages/budgets.page').then(
                                (m) => m.BudgetsPage,
                            ),
                    },
                ],
            },
            {
                path: APP_PATHS.SETTINGS,
                loadComponent: () =>
                    import('../features/settings/pages/settings.page').then(
                        (m) => m.SettingsPage,
                    ),
            },
        ],
    },
    { path: '**', redirectTo: APP_PATHS.HOME },
];
