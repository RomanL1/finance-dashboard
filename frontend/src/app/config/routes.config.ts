import { Routes } from '@angular/router';
import { AuthGuard } from '../core/auth/auth.guard';
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
        path: APP_PATHS.HOME,
        canActivate: [AuthGuard],
        loadComponent: () =>
            import('../features/household/pages/home.page').then(
                (m) => m.HomePage,
            ),
    },
    { path: '**', redirectTo: APP_PATHS.HOME },
];
