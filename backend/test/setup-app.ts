import type { INestApplication } from '@nestjs/common';

/**
 * Starts the app once on a loopback port. Without a listening server, supertest calls
 * `listen(0)` for every request: that binds `::` but sends to 127.0.0.1, and on macOS the
 * port may already belong to another app on 127.0.0.1, which then answers instead
 * ("Parse Error: Expected HTTP/", resets, foreign 404s).
 */
export async function listenOnLoopback(app: INestApplication): Promise<void> {
    await app.listen(0, '127.0.0.1');
}
