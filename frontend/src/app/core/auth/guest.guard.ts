import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { APP_PATHS } from '../../config/paths.config';

/** Keeps signed-in users off the login, sign-up and password pages. */
@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
    constructor(
        private readonly auth: AuthService,
        private readonly router: Router,
    ) {}

    async canActivate(): Promise<boolean | UrlTree> {
        if (!this.auth.ready()) {
            await this.auth.refresh();
        }
        return this.auth.isAuthenticated()
            ? this.router.createUrlTree(['/' + APP_PATHS.HOME])
            : true;
    }
}
