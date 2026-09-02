import { INestApplication, ValidationPipe } from '@nestjs/common';
import { mountAuthHandler } from './auth/index.js';
import { env } from './config/env.js';
import { DomainExceptionFilter } from './errors/domain-exception.filter.js';

/** Shared wiring for main.ts and e2e tests. Must run before app.init(). */
export function setupApp(app: INestApplication): INestApplication {
    // CORS must be registered before the auth handler: it responds directly and
    // skips later middleware, so cors headers/preflight need to run first.
    app.enableCors({ origin: env.auth.trustedOrigins, credentials: true });
    mountAuthHandler(app);
    // better-auth owns /api/auth/* directly (mounted above); every controller route gets /api/*.
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    return app;
}
