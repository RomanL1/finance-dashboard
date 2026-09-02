import type { CreateClientConfig } from './api/client.gen';

/** Runtime config picked up by the generated hey-api client. Cookies carry the better-auth session. */
export const createClientConfig: CreateClientConfig = (config) => ({
    ...config,
    baseUrl: 'http://localhost:3000',
    credentials: 'include',
});
