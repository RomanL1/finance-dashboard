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

    it('refuses to load in production without BETTER_AUTH_SECRET', async () => {
        await expect(
            loadEnv({
                NODE_ENV: 'production',
                DB_FILE_NAME: 'file::memory:',
                BETTER_AUTH_SECRET: undefined,
            }),
        ).rejects.toThrow('BETTER_AUTH_SECRET');
    });

    it('allows an unset secret outside production', async () => {
        const mod = await loadEnv({
            NODE_ENV: 'development',
            DB_FILE_NAME: 'file::memory:',
            BETTER_AUTH_SECRET: undefined,
        });
        expect(mod.env.auth.secret).toBeUndefined();
    });

    it('uses the configured secret when set', async () => {
        const mod = await loadEnv({
            NODE_ENV: 'production',
            DB_FILE_NAME: 'file::memory:',
            BETTER_AUTH_SECRET: 'a-real-secret-that-is-long-enough',
        });
        expect(mod.env.auth.secret).toBe('a-real-secret-that-is-long-enough');
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
