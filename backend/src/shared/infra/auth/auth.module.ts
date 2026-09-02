import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { auth } from './auth.js';
import { AuthGuard } from './auth.guard.js';
import { AUTH } from './auth.tokens.js';

/**
 * Exposes the better-auth instance and installs the global AuthGuard.
 * The HTTP handler for /api/auth/* is mounted separately (see auth.handler.ts) because it must
 * run before Nest's body parser consumes the request stream.
 */
@Global()
@Module({
    providers: [
        { provide: AUTH, useValue: auth },
        { provide: APP_GUARD, useClass: AuthGuard },
    ],
    exports: [AUTH],
})
export class AuthModule {}
