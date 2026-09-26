import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import { DemoLoginService } from './demo-login.service';

describe('DemoLoginService', () => {
    afterEach(() => vi.restoreAllMocks());

    it('follows the backend config', async () => {
        const fetch = mockFetch({ demoLogin: true });

        await expect(
            TestBed.inject(DemoLoginService).available(),
        ).resolves.toBe(true);
        expect(requestOf(fetch).url).toMatch(/\/api\/config$/);
    });

    it('hides demo login when the config fails or is unreachable', async () => {
        mockFetch({}, 500).mockRejectedValueOnce(
            new TypeError('Failed to fetch'),
        );
        const service = TestBed.inject(DemoLoginService);

        await expect(service.available()).resolves.toBe(false); // unreachable
        await expect(service.available()).resolves.toBe(false); // 500
    });
});
