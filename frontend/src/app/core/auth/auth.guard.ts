import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { APP_PATHS } from '../../config/paths.config';

/** Route guard: redirects anonymous users to /login. */
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(
        private readonly auth: AuthService,
        private readonly router: Router,
    ) {}

    async canActivate(): Promise<boolean | UrlTree> {
        if (!this.auth.ready()) {
            await this.auth.refresh();
        }
        return this.auth.isAuthenticated()
            ? true
            : this.router.createUrlTree(['/' + APP_PATHS.LOGIN]);
    }
}
