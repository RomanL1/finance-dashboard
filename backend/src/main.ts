import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { AppModule } from './app.module.js';
import { setupApp } from './shared/infra/app.setup.js';
import { env, isProduction } from './shared/infra/config/env.js';
import { db } from './shared/infra/db/db.js';
import { ensureDemoUser } from './shared/infra/db/seed.js';
import {
    buildOpenApiDocument,
    writeOpenApiDocument,
} from './shared/infra/openapi.js';

async function bootstrap() {
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

    if (!isProduction) {
        // Swagger UI discloses the whole API surface, so it stays out of production.
        const document = buildOpenApiDocument(app);
        SwaggerModule.setup('docs', app, document);
        // Keeps openapi.json in sync for the frontend's hey-api codegen (`bun run api:generate` there).
        writeOpenApiDocument(document);
    }

    await app.listen(env.port);
    console.log(
        `API listening on port ${env.port} (${isProduction ? '' : 'swagger: /docs, '}auth: /api/auth)`,
    );
}

await bootstrap();
