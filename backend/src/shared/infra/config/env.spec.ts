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

    const PRODUCTION = {
        NODE_ENV: 'production',
        DB_FILE_NAME: 'file::memory:',
        BETTER_AUTH_SECRET: 'a-real-secret-that-is-long-enough',
        APP_URL: 'https://finance.example.com',
        RESEND_API_KEY: 're_test',
        MAIL_FROM: 'Finance <noreply@finance.example.com>',
    };

    it('uses the configured values in production', async () => {
        const { env } = await loadEnv(PRODUCTION);
        expect(env.auth.secret).toBe('a-real-secret-that-is-long-enough');
        expect(env.appUrl).toBe('https://finance.example.com');
        expect(env.mail).toEqual({
            resendApiKey: 're_test',
            from: 'Finance <noreply@finance.example.com>',
            outboxDir: undefined,
        });
    });

    it.each(['APP_URL', 'RESEND_API_KEY', 'MAIL_FROM'])(
        'refuses to load in production without %s',
        async (name) => {
            await expect(
                loadEnv({ ...PRODUCTION, [name]: undefined }),
            ).rejects.toThrow(name);
        },
    );

    it('defaults app URL and sender outside production and sends no mail without a key', async () => {
        const { env } = await loadEnv({
            NODE_ENV: 'development',
            DB_FILE_NAME: 'file::memory:',
            APP_URL: undefined,
            RESEND_API_KEY: undefined,
            MAIL_FROM: undefined,
        });
        expect(env.appUrl).toBe('http://localhost:4200');
        expect(env.mail.resendApiKey).toBeUndefined();
        expect(env.mail.from).toBe('Finance Dashboard <noreply@localhost>');
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

    it('refuses to load without DB_FILE_NAME', async () => {
        await expect(loadEnv({ DB_FILE_NAME: undefined })).rejects.toThrow(
            'DB_FILE_NAME',
        );
    });

    it('defaults port, auth URL and trusted origins for local development', async () => {
        const { env, isProduction } = await loadEnv({
            NODE_ENV: undefined,
            DB_FILE_NAME: 'file::memory:',
            PORT: undefined,
            BETTER_AUTH_URL: undefined,
            TRUSTED_ORIGINS: undefined,
        });
        expect(env.nodeEnv).toBe('development');
        expect(isProduction).toBe(false);
        expect(env.port).toBe(3000);
        expect(env.auth.baseUrl).toBe('http://localhost:3000');
        expect(env.auth.trustedOrigins).toEqual(['http://localhost:4200']);
    });

    it('splits TRUSTED_ORIGINS on commas, trimming and dropping blanks', async () => {
        const { env } = await loadEnv({
            DB_FILE_NAME: 'file::memory:',
            PORT: '8080',
            TRUSTED_ORIGINS: ' https://a.example , ,https://b.example,',
        });
        expect(env.port).toBe(8080);
        expect(env.auth.trustedOrigins).toEqual([
            'https://a.example',
            'https://b.example',
        ]);
    });
});
