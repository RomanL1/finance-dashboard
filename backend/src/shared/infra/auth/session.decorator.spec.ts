import type { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { describe, expect, it } from 'vitest';
import { makeSession } from '../../../../test/fixtures/auth-session.js';
import {
    type AuthenticatedRequest,
    CurrentSession,
    CurrentUser,
} from './session.decorator.js';

type Factory = (data: unknown, ctx: ExecutionContext) => unknown;

/** Param decorators hide their factory in route metadata; apply one to a dummy handler to get it back. */
function factoryOf(decorator: () => ParameterDecorator): Factory {
    class Controller {
        handle(@decorator() _value: unknown): void {}
    }
    const args = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        Controller,
        'handle',
    ) as Record<string, { factory: Factory }>;
    return Object.values(args)[0].factory;
}

function contextWith(request: Partial<AuthenticatedRequest>) {
    return new ExecutionContextHost([request]);
}

const session = makeSession();

describe('session param decorators', () => {
    it('CurrentSession returns the session the guard attached', () => {
        expect(
            factoryOf(CurrentSession)(undefined, contextWith({ session })),
        ).toBe(session);
    });

    it('CurrentUser returns the session user', () => {
        expect(
            factoryOf(CurrentUser)(undefined, contextWith({ session })),
        ).toBe(session.user);
    });

    it.each([CurrentSession, CurrentUser])(
        'fails loudly on an unguarded route',
        (decorator) => {
            expect(() =>
                factoryOf(decorator)(undefined, contextWith({})),
            ).toThrow('No session on request');
        },
    );
});
