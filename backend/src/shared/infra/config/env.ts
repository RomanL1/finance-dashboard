import 'dotenv/config';

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

/** Used when BETTER_AUTH_SECRET is unset so `docker compose up` works without setup. Loudly warned about in production. */
export const INSECURE_DEFAULT_SECRET =
    'insecure-default-secret-change-me-in-production';

export const env = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    dbFileName: required('DB_FILE_NAME'),
    /** Create the demo user on boot (see db/seed.ts). */
    seedDemo: process.env.SEED_DEMO === 'true',
    auth: {
        secret: process.env.BETTER_AUTH_SECRET || INSECURE_DEFAULT_SECRET,
        baseUrl: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
        trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:4200')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
    },
} as const;

export const isProduction = env.nodeEnv === 'production';
export const isInsecureSecret = env.auth.secret === INSECURE_DEFAULT_SECRET;
