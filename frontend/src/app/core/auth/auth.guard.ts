import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Route guard: redirects anonymous users to /login. */
export const authGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    if (!auth.ready()) {
        await auth.refresh();
    }
    return auth.isAuthenticated()
        ? true
        : inject(Router).createUrlTree(['/login']);
};
