import { readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** The e2e API writes every mail here as JSON instead of sending it (MAIL_OUTBOX_DIR). */
export const MAIL_OUTBOX_DIR = join(
    tmpdir(),
    'finance-dashboard-playwright-mail',
);

interface Mail {
    to: string;
    subject: string;
    text: string;
}

/** The link of the newest mail to `to`. Mails are written before the API responds. */
export function lastMailLink(to: string): string {
    const mail = readdirSync(MAIL_OUTBOX_DIR)
        .sort()
        .map(
            (name) =>
                JSON.parse(
                    readFileSync(join(MAIL_OUTBOX_DIR, name), 'utf8'),
                ) as Mail,
        )
        .filter((m) => m.to === to)
        .at(-1);
    const link = mail?.text.match(/https?:\/\/\S+/)?.[0];
    if (!link) throw new Error(`no mail with a link to ${to}`);
    return link;
}
