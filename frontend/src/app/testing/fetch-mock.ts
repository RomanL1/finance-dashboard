import { vi, type MockInstance } from 'vitest';
import { client } from '../core/api/client.gen';

/** Node's `Request` rejects the app's relative base URL. */
const TEST_ORIGIN = 'http://localhost';

/** Replies to every `fetch` with `body` as JSON. The generated API client resolves `fetch` per request. */
export function mockFetch(
    body: unknown = null,
    status = 200,
): MockInstance<typeof fetch> {
    client.setConfig({ baseUrl: TEST_ORIGIN });
    return vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
        Promise.resolve(
            new Response(status === 204 ? null : JSON.stringify(body), {
                status,
                headers: { 'Content-Type': 'application/json' },
            }),
        ),
    );
}

/** The request the n-th `fetch` call received. */
export function requestOf(spy: MockInstance<typeof fetch>, call = 0): Request {
    return spy.mock.calls[call][0] as Request;
}
