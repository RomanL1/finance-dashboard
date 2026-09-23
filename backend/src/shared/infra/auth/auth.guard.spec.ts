import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { describe, expect, it, vi } from 'vitest';
import { makeSession } from '../../../../test/fixtures/auth-session.js';
import type { AuthSession, SessionLookup } from './auth.js';
import { AuthGuard } from './auth.guard.js';
import { Public } from './public.decorator.js';
import type { AuthenticatedRequest } from './session.decorator.js';

const session = makeSession();

class Controller {
    @Public()
    open(): void {}

    guarded(): void {}
}

function makeGuard(found: AuthSession | null = session) {
    const getSession = vi
        .fn<SessionLookup['api']['getSession']>()
        .mockResolvedValue(found);
    const guard = new AuthGuard(new Reflector(), { api: { getSession } });
    return { guard, getSession };
}

function contextFor(
    handler: keyof Controller,
    request: Partial<AuthenticatedRequest>,
) {
    return new ExecutionContextHost(
        [request],
        Controller,
        Controller.prototype[handler],
    );
}

describe('AuthGuard', () => {
    it('lets @Public() routes through without looking up a session', async () => {
        const { guard, getSession } = makeGuard();

        await expect(
            guard.canActivate(contextFor('open', { headers: {} })),
        ).resolves.toBe(true);
        expect(getSession).not.toHaveBeenCalled();
    });

    it('rejects a guarded route without a session', async () => {
        const { guard } = makeGuard(null);

        await expect(
            guard.canActivate(contextFor('guarded', { headers: {} })),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('attaches the session to the request', async () => {
        const { guard, getSession } = makeGuard();
        const request: Partial<AuthenticatedRequest> = {
            headers: { cookie: 'better-auth.session_token=abc' },
        };

        await expect(
            guard.canActivate(contextFor('guarded', request)),
        ).resolves.toBe(true);
        expect(request.session).toBe(session);
        const { headers } = getSession.mock.calls[0][0];
        expect(headers.get('cookie')).toBe('better-auth.session_token=abc');
    });
});
