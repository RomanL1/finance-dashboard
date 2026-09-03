import { Routes } from '@angular/router';
import { AuthGuard } from '../core/auth/auth.guard';
import {
    OnboardingCompleteGuard,
    OnboardingGuard,
} from '../features/household/services/onboarding.guard';
import { APP_PATHS } from './paths.config';

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
        path: APP_PATHS.HOME,
        canActivate: [AuthGuard, OnboardingGuard],
        loadComponent: () =>
            import('../features/household/pages/home.page').then(
                (m) => m.HomePage,
            ),
    },
    { path: '**', redirectTo: APP_PATHS.HOME },
];
