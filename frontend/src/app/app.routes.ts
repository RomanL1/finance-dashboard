import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/login.page').then((m) => m.LoginPage),
    },
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/household/home.page').then((m) => m.HomePage),
    },
    { path: '**', redirectTo: '' },
];
