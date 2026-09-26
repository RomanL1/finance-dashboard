import type { Mail } from './mailer.js';

export const MAIL_LANGUAGES = ['en', 'de'] as const;
export type MailLanguage = (typeof MAIL_LANGUAGES)[number];

/**
 * The frontend sends its current UI language as Accept-Language on auth calls (see auth-client.ts).
 * First supported tag wins; quality weights are ignored because the frontend sends a single tag.
 */
export function mailLanguage(request?: Request): MailLanguage {
    const header = request?.headers.get('accept-language') ?? '';
    for (const tag of header.split(',')) {
        const primary = tag.split(';')[0]!.trim().slice(0, 2).toLowerCase();
        const match = MAIL_LANGUAGES.find((lang) => lang === primary);
        if (match) return match;
    }
    return 'en';
}

interface MailContent {
    subject: string;
    greeting: (name: string) => string;
    body: string;
    action: string;
    footer: string;
}

type AuthMailKind = 'verifyEmail' | 'resetPassword' | 'existingAccount';

const CONTENT: Record<MailLanguage, Record<AuthMailKind, MailContent>> = {
    en: {
        verifyEmail: {
            subject: 'Confirm your email address',
            greeting: (name) => `Hi ${name},`,
            body: 'Please confirm your email address to finish creating your Finance Dashboard account.',
            action: 'Confirm email address',
            footer: 'The link is valid for 24 hours. If you did not sign up, you can ignore this email.',
        },
        resetPassword: {
            subject: 'Reset your password',
            greeting: (name) => `Hi ${name},`,
            body: 'We received a request to reset the password of your Finance Dashboard account.',
            action: 'Choose a new password',
            footer: 'The link is valid for 1 hour. If you did not request this, you can ignore this email; your password stays the same.',
        },
        existingAccount: {
            subject: 'You already have an account',
            greeting: (name) => `Hi ${name},`,
            body: 'Someone tried to sign up for Finance Dashboard with this email address, but an account already exists. If that was you, log in or reset your password.',
            action: 'Reset password',
            footer: 'If this was not you, you can ignore this email.',
        },
    },
    de: {
        verifyEmail: {
            subject: 'Bestätige deine E-Mail-Adresse',
            greeting: (name) => `Hallo ${name},`,
            body: 'Bitte bestätige deine E-Mail-Adresse, um dein Finance-Dashboard-Konto fertig einzurichten.',
            action: 'E-Mail-Adresse bestätigen',
            footer: 'Der Link ist 24 Stunden gültig. Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.',
        },
        resetPassword: {
            subject: 'Passwort zurücksetzen',
            greeting: (name) => `Hallo ${name},`,
            body: 'Wir haben eine Anfrage erhalten, das Passwort deines Finance-Dashboard-Kontos zurückzusetzen.',
            action: 'Neues Passwort wählen',
            footer: 'Der Link ist 1 Stunde gültig. Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren; dein Passwort bleibt unverändert.',
        },
        existingAccount: {
            subject: 'Du hast bereits ein Konto',
            greeting: (name) => `Hallo ${name},`,
            body: 'Jemand hat versucht, sich mit dieser E-Mail-Adresse bei Finance Dashboard zu registrieren, aber es gibt bereits ein Konto. Falls du das warst, melde dich an oder setze dein Passwort zurück.',
            action: 'Passwort zurücksetzen',
            footer: 'Falls du das nicht warst, kannst du diese E-Mail ignorieren.',
        },
    },
};

/** The user's name is user input and ends up in HTML. */
function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export interface AuthMailInput {
    kind: AuthMailKind;
    language: MailLanguage;
    to: string;
    name: string;
    url: string;
}

export function authMail({
    kind,
    language,
    to,
    name,
    url,
}: AuthMailInput): Mail {
    const c = CONTENT[language][kind];
    const href = escapeHtml(url);
    return {
        to,
        subject: c.subject,
        text: [
            c.greeting(name),
            '',
            c.body,
            '',
            `${c.action}: ${url}`,
            '',
            c.footer,
        ].join('\n'),
        html: `<!doctype html>
<html lang="${language}">
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1b1b1f; max-width: 560px; margin: 0 auto; padding: 24px;">
<p>${escapeHtml(c.greeting(name))}</p>
<p>${escapeHtml(c.body)}</p>
<p><a href="${href}" style="display: inline-block; padding: 10px 20px; border-radius: 20px; background: #3f5f90; color: #ffffff; text-decoration: none;">${escapeHtml(c.action)}</a></p>
<p style="font-size: 14px; color: #44474e;">${escapeHtml(c.footer)}</p>
<p style="font-size: 12px; color: #74777f; word-break: break-all;">${href}</p>
</body>
</html>`,
    };
}
