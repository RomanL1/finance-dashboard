import { readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Mail } from '../../src/shared/infra/mail/mailer.js';

/** Set by vitest.config.e2e.ts; the app's file transport writes here. */
function outboxDir(): string {
    const dir = process.env['MAIL_OUTBOX_DIR'];
    if (!dir) throw new Error('MAIL_OUTBOX_DIR is not set');
    return dir;
}

export async function clearOutbox(): Promise<void> {
    await rm(outboxDir(), { recursive: true, force: true });
}

/** All mails sent to `to`, oldest first (file names start with the send timestamp). */
export async function mailsTo(to: string): Promise<Mail[]> {
    const names = await readdir(outboxDir()).catch(() => []);
    const mails = await Promise.all(
        names
            .sort()
            .map(
                async (name) =>
                    JSON.parse(
                        await readFile(join(outboxDir(), name), 'utf8'),
                    ) as Mail,
            ),
    );
    return mails.filter((mail) => mail.to === to);
}

export async function lastMailTo(to: string): Promise<Mail> {
    const mail = (await mailsTo(to)).at(-1);
    if (!mail) throw new Error(`no mail to ${to}`);
    return mail;
}

/** The link in the mail carries the token as `?token=`. */
export function tokenFrom(mail: Mail): string {
    const token = /[?&]token=([^&\s]+)/.exec(mail.text)?.[1];
    if (!token) throw new Error(`no token in mail "${mail.subject}"`);
    return decodeURIComponent(token);
}
