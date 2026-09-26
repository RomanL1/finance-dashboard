import { defineConfig, devices } from '@playwright/test';
import { MAIL_OUTBOX_DIR } from './playwright/support/mail';

/** Own ports so e2e never touches the dev servers on :3000/:4200. */
const API_PORT = 3100;
const WEB_PORT = 4300;
const WEB_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
    testDir: './playwright/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env['CI'],
    retries: process.env['CI'] ? 2 : 0,
    reporter: process.env['CI'] ? 'github' : 'list',
    use: {
        baseURL: WEB_URL,
        trace: 'on-first-retry',
    },
    /** M15: every flow runs on desktop and on a phone viewport (navigation bar, compact FAB). */
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
        { name: 'mobile', use: { ...devices['Pixel 7'] } },
    ],
    webServer: [
        {
            /** In-memory sqlite: every run starts from migrations + the demo user, nothing to clean up. */
            command: 'bun src/main.ts',
            cwd: '../backend',
            url: `http://localhost:${API_PORT}/api/health`,
            reuseExistingServer: false,
            env: {
                PORT: String(API_PORT),
                DB_FILE_NAME: ':memory:',
                SEED_DEMO: 'true',
                BETTER_AUTH_SECRET: 'e2e-secret-0123456789-0123456789',
                BETTER_AUTH_URL: `http://localhost:${API_PORT}`,
                TRUSTED_ORIGINS: WEB_URL,
                APP_URL: WEB_URL,
                MAIL_OUTBOX_DIR,
            },
        },
        {
            command: `ng serve --port ${WEB_PORT} --proxy-config playwright/proxy.conf.json`,
            url: WEB_URL,
            reuseExistingServer: !process.env['CI'],
            timeout: 180_000,
        },
    ],
});
