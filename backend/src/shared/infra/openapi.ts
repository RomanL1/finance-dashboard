import { writeFileSync } from 'node:fs';
import type { INestApplication } from '@nestjs/common';
import {
    DocumentBuilder,
    SwaggerModule,
    type OpenAPIObject,
} from '@nestjs/swagger';

export const OPENAPI_FILE = 'openapi.json';

/** Builds the OpenAPI document. Operation ids are `{controller}{Method}` so hey-api generates readable SDK names. */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
    const config = new DocumentBuilder()
        .setTitle('finance-dashboard-api')
        .setVersion('1.0')
        .addCookieAuth('better-auth.session_token')
        .build();
    return SwaggerModule.createDocument(app, config, {
        operationIdFactory: (controllerKey, methodKey) => {
            const name = controllerKey.replace(/Controller$/, '');
            return (
                name.charAt(0).toLowerCase() +
                name.slice(1) +
                methodKey.charAt(0).toUpperCase() +
                methodKey.slice(1)
            );
        },
    });
}

/** Writes the document next to package.json. The frontend's hey-api codegen reads this file. */
export function writeOpenApiDocument(
    document: OpenAPIObject,
    file = OPENAPI_FILE,
): void {
    writeFileSync(file, JSON.stringify(document, null, 2) + '\n');
}
