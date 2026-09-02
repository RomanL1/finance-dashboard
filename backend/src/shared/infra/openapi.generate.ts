/** Standalone: `bun run openapi:generate`. Builds the app graph without listening and writes openapi.json. */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.js';
import { setupApp } from './app.setup.js';
import {
    buildOpenApiDocument,
    OPENAPI_FILE,
    writeOpenApiDocument,
} from './openapi.js';

const app = setupApp(await NestFactory.create(AppModule, { logger: false }));
writeOpenApiDocument(buildOpenApiDocument(app));
await app.close();
console.log(`wrote ${OPENAPI_FILE}`);
