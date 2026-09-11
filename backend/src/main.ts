import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { AppModule } from './app.module.js';
import { setupApp } from './shared/infra/app.setup.js';
import {
    env,
    isInsecureSecret,
    isProduction,
} from './shared/infra/config/env.js';
import { db } from './shared/infra/db/db.js';
import { ensureDemoUser } from './shared/infra/db/seed.js';
import {
    buildOpenApiDocument,
    writeOpenApiDocument,
} from './shared/infra/openapi.js';

async function bootstrap() {
    if (isProduction && isInsecureSecret) {
        console.warn(
            [
                '',
                '!!! WARNING: BETTER_AUTH_SECRET is not set. Running with an INSECURE default secret.',
                '!!! Sessions can be forged. Set BETTER_AUTH_SECRET to a random string (>= 32 chars) before exposing this instance.',
                '',
            ].join('\n'),
        );
    }

    // Idempotent: drizzle tracks applied migrations in __drizzle_migrations.
    // Folder sits next to the compiled output (dist/ or src/), so no config is needed.
    await migrate(db, {
        migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
    });
    if (env.seedDemo) {
        // Create-only: never resets existing demo data across restarts (unlike `bun run db:seed`).
        await ensureDemoUser();
    }

    const app = setupApp(await NestFactory.create(AppModule));
    // SIGTERM/SIGINT from the container runtime close the server instead of being killed after the grace period.
    app.enableShutdownHooks();

    const document = buildOpenApiDocument(app);
    SwaggerModule.setup('docs', app, document);
    if (!isProduction) {
        // Keeps openapi.json in sync for the frontend's hey-api codegen (`bun run api:generate` there).
        writeOpenApiDocument(document);
    }

    await app.listen(env.port);
    console.log(
        `API listening on port ${env.port} (swagger: /docs, auth: /api/auth)`,
    );
}

await bootstrap();
