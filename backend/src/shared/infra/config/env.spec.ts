import { afterEach, describe, expect, it, vi } from 'vitest';

// env.ts imports dotenv/config, which would re-read .env and undo the overrides below.
vi.mock('dotenv/config', () => ({}));

async function loadEnv(overrides: Record<string, string | undefined>) {
    vi.resetModules();
    const previous: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(overrides)) {
        previous[key] = process.env[key];
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
    try {
        return await import('./env.js');
    } finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    }
}

describe('env', () => {
    afterEach(() => vi.resetModules());

    it('falls back to the insecure default secret when BETTER_AUTH_SECRET is unset', async () => {
        const mod = await loadEnv({
            DB_FILE_NAME: 'file::memory:',
            BETTER_AUTH_SECRET: undefined,
        });
        expect(mod.env.auth.secret).toBe(mod.INSECURE_DEFAULT_SECRET);
        expect(mod.isInsecureSecret).toBe(true);
    });

    it('uses the configured secret when set', async () => {
        const mod = await loadEnv({
            DB_FILE_NAME: 'file::memory:',
            BETTER_AUTH_SECRET: 'a-real-secret-that-is-long-enough',
        });
        expect(mod.isInsecureSecret).toBe(false);
    });

    it('parses SEED_DEMO as a boolean flag', async () => {
        expect(
            (
                await loadEnv({
                    DB_FILE_NAME: 'file::memory:',
                    SEED_DEMO: 'true',
                })
            ).env.seedDemo,
        ).toBe(true);
        expect(
            (
                await loadEnv({
                    DB_FILE_NAME: 'file::memory:',
                    SEED_DEMO: undefined,
                })
            ).env.seedDemo,
        ).toBe(false);
    });
});
