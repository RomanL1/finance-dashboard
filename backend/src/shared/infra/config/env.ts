import 'dotenv/config';

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export const env = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    dbFileName: required('DB_FILE_NAME'),
    auth: {
        secret: required('BETTER_AUTH_SECRET'),
        baseUrl: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
        trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:4200')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
    },
} as const;

export const isProduction = env.nodeEnv === 'production';
