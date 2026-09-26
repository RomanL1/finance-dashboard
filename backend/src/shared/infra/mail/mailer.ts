import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Resend } from 'resend';
import { env } from '../config/env.js';

export interface Mail {
    to: string;
    subject: string;
    html: string;
    text: string;
}

export type SendMail = (mail: Mail) => Promise<void>;

/** Sends through the Resend API. Resend reports failures in the result instead of throwing. */
export function resendTransport(apiKey: string, from: string): SendMail {
    const resend = new Resend(apiKey);
    return async (mail) => {
        const { error } = await resend.emails.send({ from, ...mail });
        if (error) {
            throw new Error(
                `Resend rejected mail to ${mail.to}: ${error.message}`,
            );
        }
    };
}

/** Tests: one JSON file per mail, so e2e specs can read the links out of it. */
export function fileTransport(dir: string): SendMail {
    return async (mail) => {
        await mkdir(dir, { recursive: true });
        const name = `${Date.now()}-${crypto.randomUUID()}.json`;
        await writeFile(join(dir, name), JSON.stringify(mail));
    };
}

/** Dev without an API key: the link is in the text body, so printing it is enough to click through. */
export function consoleTransport(): SendMail {
    return async (mail) => {
        console.log(`[mail] to ${mail.to}: ${mail.subject}\n${mail.text}`);
    };
}

function createTransport(): SendMail {
    if (env.mail.outboxDir) return fileTransport(env.mail.outboxDir);
    if (env.mail.resendApiKey) {
        return resendTransport(env.mail.resendApiKey, env.mail.from);
    }
    return consoleTransport();
}

export const sendMail: SendMail = createTransport();
