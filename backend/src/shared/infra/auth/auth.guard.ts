import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { fromNodeHeaders } from 'better-auth/node';
import { AUTH } from './auth.tokens.js';
import type { Auth } from './auth.js';
import { IS_PUBLIC } from './public.decorator.js';
import type { AuthenticatedRequest } from './session.decorator.js';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @Inject(AUTH) private readonly auth: Auth,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();
        const session = await this.auth.api.getSession({
            headers: fromNodeHeaders(request.headers),
        });
        if (!session) {
            throw new UnauthorizedException();
        }
        request.session = session;
        return true;
    }
}
