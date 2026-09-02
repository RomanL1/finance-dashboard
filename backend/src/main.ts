import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { setupApp } from './shared/infra/app.setup.js';
import { env, isProduction } from './shared/infra/config/env.js';
import {
    buildOpenApiDocument,
    writeOpenApiDocument,
} from './shared/infra/openapi.js';

async function bootstrap() {
    const app = setupApp(await NestFactory.create(AppModule));

    const document = buildOpenApiDocument(app);
    SwaggerModule.setup('docs', app, document);
    if (!isProduction) {
        // Keeps openapi.json in sync for the frontend's hey-api codegen (`bun run api:generate` there).
        writeOpenApiDocument(document);
    }

    await app.listen(env.port);
    console.log(
        `API on http://localhost:${env.port} (swagger: /docs, auth: /api/auth)`,
    );
}

await bootstrap();
