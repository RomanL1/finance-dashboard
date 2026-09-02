import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthSession, SessionUser } from './auth.js';

export type AuthenticatedRequest = Request & { session?: AuthSession };

export const CurrentSession = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): AuthSession => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
        if (!request.session) {
            throw new Error(
                'No session on request. Is the route guarded by AuthGuard?',
            );
        }
        return request.session;
    },
);

export const CurrentUser = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): SessionUser => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
        if (!request.session) {
            throw new Error(
                'No session on request. Is the route guarded by AuthGuard?',
            );
        }
        return request.session.user;
    },
);
