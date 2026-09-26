import { Routes } from '@angular/router';
import { AuthGuard } from '../core/auth/auth.guard';
import { GuestGuard } from '../core/auth/guest.guard';
import {
    OnboardingCompleteGuard,
    OnboardingGuard,
} from '../features/household/services/onboarding.guard';
import { ANALYTICS_PATHS, APP_PATHS } from './paths.config';

const loadShellPage = () =>
    import('../features/shell/pages/shell.page').then((m) => m.ShellPage);
const loadHomePage = () =>
    import('../features/household/pages/home.page').then((m) => m.HomePage);
const loadTransactionsPage = () =>
    import('../features/transaction/pages/transactions.page').then(
        (m) => m.TransactionsPage,
    );
const loadAnalyticsPage = () =>
    import('../features/analytics/pages/analytics.page').then(
        (m) => m.AnalyticsPage,
    );
const loadSettingsPage = () =>
    import('../features/settings/pages/settings.page').then(
        (m) => m.SettingsPage,
    );

/** Shell tab by first URL segment. */
const TAB_PAGES: Record<string, () => Promise<unknown>> = {
    [APP_PATHS.HOME]: loadHomePage,
    [APP_PATHS.TRANSACTIONS]: loadTransactionsPage,
    [APP_PATHS.ANALYTICS]: loadAnalyticsPage,
    [APP_PATHS.SETTINGS]: loadSettingsPage,
};

/**
 * The router loads a route's components only after its guards pass, and the shell guards
 * wait on the session and household requests. Called at boot, this starts the shell and
 * tab downloads for `pathname` right away so they overlap those requests.
 */
export function prefetchShellTab(pathname: string): void {
    const loadTab = TAB_PAGES[pathname.split('/')[1] ?? ''];
    if (!loadTab) return;
    void loadShellPage();
    void loadTab();
}

export const routes: Routes = [
    {
        path: APP_PATHS.LOGIN,
        canActivate: [GuestGuard],
        loadComponent: () =>
            import('../features/auth/pages/login.page').then(
                (m) => m.LoginPage,
            ),
    },
    {
        path: APP_PATHS.SIGNUP,
        canActivate: [GuestGuard],
        loadComponent: () =>
            import('../features/auth/pages/signup.page').then(
                (m) => m.SignupPage,
            ),
    },
    {
        path: APP_PATHS.CHECK_EMAIL,
        canActivate: [GuestGuard],
        loadComponent: () =>
            import('../features/auth/pages/check-email.page').then(
                (m) => m.CheckEmailPage,
            ),
    },
    {
        /** No guest guard: a link opened while signed in as someone else still verifies its own account. */
        path: APP_PATHS.VERIFY_EMAIL,
        loadComponent: () =>
            import('../features/auth/pages/verify-email.page').then(
                (m) => m.VerifyEmailPage,
            ),
    },
    {
        path: APP_PATHS.FORGOT_PASSWORD,
        canActivate: [GuestGuard],
        loadComponent: () =>
            import('../features/auth/pages/forgot-password.page').then(
                (m) => m.ForgotPasswordPage,
            ),
    },
    {
        path: APP_PATHS.RESET_PASSWORD,
        canActivate: [GuestGuard],
        loadComponent: () =>
            import('../features/auth/pages/reset-password.page').then(
                (m) => m.ResetPasswordPage,
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
        loadComponent: loadShellPage,
        children: [
            {
                path: APP_PATHS.HOME,
                loadComponent: loadHomePage,
            },
            {
                path: APP_PATHS.TRANSACTIONS,
                loadComponent: loadTransactionsPage,
            },
            {
                /** Layout route: analytics tab row + outlet; both tabs share the `?period&start` params. */
                path: APP_PATHS.ANALYTICS,
                loadComponent: loadAnalyticsPage,
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
                loadComponent: loadSettingsPage,
            },
        ],
    },
    { path: '**', redirectTo: APP_PATHS.HOME },
];
