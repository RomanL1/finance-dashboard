import { accountGetAccounts, householdList } from '../../../core/api';
import { client } from '../../../core/api/client.gen';
import { mockFetch } from '../../../testing/fetch-mock';
import { watchHouseholdAccess } from './household-access';
import type { HouseholdService } from './household.service';

describe('watchHouseholdAccess', () => {
    let leaveIfRemoved: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        leaveIfRemoved = vi.fn().mockResolvedValue(undefined);
        watchHouseholdAccess({ leaveIfRemoved } as unknown as HouseholdService);
    });

    afterEach(() => {
        client.interceptors.response.clear();
        vi.restoreAllMocks();
    });

    it('checks the membership after a 403 on household data', async () => {
        mockFetch({ message: 'Forbidden' }, 403);

        const response = await accountGetAccounts({
            path: { householdId: 'h1' },
        });

        expect(response.response?.status).toBe(403);
        expect(leaveIfRemoved).toHaveBeenCalledWith('h1');
    });

    it.each([200, 401, 404, 500])('ignores status %i', async (status) => {
        mockFetch([], status);
        await accountGetAccounts({ path: { householdId: 'h1' } });
        expect(leaveIfRemoved).not.toHaveBeenCalled();
    });

    it('ignores a 403 that names no household', async () => {
        mockFetch({ message: 'Forbidden' }, 403);
        await householdList();
        expect(leaveIfRemoved).not.toHaveBeenCalled();
    });
});
