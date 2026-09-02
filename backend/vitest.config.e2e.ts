import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
    env: { DB_FILE_NAME: ':memory:', BETTER_AUTH_SECRET: 'e2e-secret-0123456789-0123456789' },
  },
});
