import type { CreateClientConfig } from './api/client.gen';

/** Runtime config picked up by the generated hey-api client. Cookies carry the better-auth session.
 *  Relative baseUrl: dev-server proxy.conf.json forwards /api to the backend. */
export const createClientConfig: CreateClientConfig = (config) => ({
    ...config,
    baseUrl: '',
    credentials: 'include',
});
