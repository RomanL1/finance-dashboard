import { defineConfig } from 'vitest/config';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
    env: {
      DB_FILE_NAME: ':memory:',
      BETTER_AUTH_SECRET: 'e2e-secret-0123456789-0123456789',
      // Mails land here as JSON (see test/support/mail.ts); cleared by prepareTestDb.
      MAIL_OUTBOX_DIR: join(tmpdir(), 'finance-dashboard-e2e-mail'),
    },
  },
});
