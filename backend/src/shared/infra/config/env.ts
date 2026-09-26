import 'dotenv/config';

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
export const isProduction = nodeEnv === 'production';

/** Required in production, optional (with a dev default) elsewhere. */
function requiredInProduction(name: string, fallback: string): string;
function requiredInProduction(name: string): string | undefined;
function requiredInProduction(
    name: string,
    fallback?: string,
): string | undefined {
    return isProduction ? required(name) : (process.env[name] ?? fallback);
}

export const env = {
    nodeEnv,
    port: Number(process.env.PORT ?? 3000),
    dbFileName: required('DB_FILE_NAME'),
    /** Create the demo user on boot (see db/seed.ts). */
    seedDemo: process.env.SEED_DEMO === 'true',
    auth: {
        /** Required in production: a public fallback would let anyone forge session cookies. */
        secret: requiredInProduction('BETTER_AUTH_SECRET'),
        baseUrl: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
        trustedOrigins: (process.env.TRUSTED_ORIGINS ?? 'http://localhost:4200')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
    },
    /** Public origin of the frontend. Links in emails point here. */
    appUrl: requiredInProduction('APP_URL', 'http://localhost:4200'),
    mail: {
        /** Without a key outside production, mails are printed to the console instead of sent. */
        resendApiKey: requiredInProduction('RESEND_API_KEY'),
        from: requiredInProduction(
            'MAIL_FROM',
            'Finance Dashboard <noreply@localhost>',
        ),
        /** Tests only: write each mail as JSON into this directory instead of sending it. */
        outboxDir: process.env.MAIL_OUTBOX_DIR,
    },
} as const;
