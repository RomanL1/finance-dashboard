import { client } from '../../../core/api/client.gen';
import { HouseholdService } from './household.service';

const HOUSEHOLD_URL = /\/api\/households\/([^/?]+)\//;

/**
 * A 403 on a household's data can mean the owner removed this user while the app was open.
 * The check runs next to the failed request, which still fails for its caller.
 */
export function watchHouseholdAccess(households: HouseholdService): void {
    client.interceptors.response.use((response, request) => {
        const householdId = HOUSEHOLD_URL.exec(request.url)?.[1];
        if (response.status === 403 && householdId) {
            void households.leaveIfRemoved(decodeURIComponent(householdId));
        }
        return response;
    });
}
