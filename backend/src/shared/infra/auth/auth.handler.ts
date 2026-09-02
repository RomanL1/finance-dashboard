import type { INestApplication } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';
import { auth } from './auth.js';

const AUTH_PREFIX = '/api/auth';

/**
 * Mount better-auth's HTTP handler. Call this BEFORE app.init()/listen() so it precedes the
 * body parser: better-auth reads the raw request body itself.
 */
export function mountAuthHandler(app: INestApplication): void {
    const handler = toNodeHandler(auth);
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.originalUrl.startsWith(AUTH_PREFIX)) {
            void handler(req, res);
            return;
        }
        next();
    });
}
