import { test as base } from '@playwright/test';
import { newUser, onboard, signUp, type TestUser } from '../support/api';

interface Fixtures {
    /** Fresh signed-in user without a household (lands on onboarding). */
    user: TestUser;
    /** Fresh signed-in user with a finished onboarding; value is the household name. */
    household: string;
}

export const test = base.extend<Fixtures>({
    user: async ({ page }, use) => {
        const user = newUser();
        await signUp(page.request, user);
        await use(user);
    },
    household: async ({ page, user }, use) => {
        const name = `${user.name} home`;
        await onboard(page.request, name);
        await use(name);
    },
});

export { expect } from '@playwright/test';
