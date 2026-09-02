import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../backend/openapi.json',
  output: { path: 'src/app/core/api', format: 'prettier' },
  plugins: [{ name: '@hey-api/client-fetch', runtimeConfigPath: './src/app/core/api-config' }],
});
