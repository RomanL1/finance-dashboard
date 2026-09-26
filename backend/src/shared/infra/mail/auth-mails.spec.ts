import { describe, expect, it } from 'vitest';
import { authMail, mailLanguage } from './auth-mails.js';

const withLanguage = (value?: string) =>
    new Request('http://localhost/', {
        headers: value === undefined ? {} : { 'accept-language': value },
    });

describe('mailLanguage', () => {
    it.each([
        ['de', 'de'],
        ['de-CH', 'de'],
        ['EN-us', 'en'],
        ['fr-FR, de;q=0.8', 'de'],
        ['fr', 'en'],
        ['', 'en'],
    ])('%j → %s', (header, expected) => {
        expect(mailLanguage(withLanguage(header))).toBe(expected);
    });

    it('falls back to English without a request or header', () => {
        expect(mailLanguage()).toBe('en');
        expect(mailLanguage(withLanguage())).toBe('en');
    });
});

describe('authMail', () => {
    const mail = authMail({
        kind: 'resetPassword',
        language: 'en',
        to: 'a@finance.local',
        name: `<script>alert("x")</script>`,
        url: 'https://app.example/reset-password?token=a&b',
    });

    it('addresses the recipient and puts the link into both bodies', () => {
        expect(mail.to).toBe('a@finance.local');
        expect(mail.subject).toBe('Reset your password');
        expect(mail.text).toContain(
            'https://app.example/reset-password?token=a&b',
        );
        expect(mail.html).toContain(
            'href="https://app.example/reset-password?token=a&amp;b"',
        );
    });

    it('escapes the name in HTML but keeps it verbatim in plain text', () => {
        expect(mail.html).not.toContain('<script>');
        expect(mail.html).toContain(
            '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
        );
        expect(mail.text).toContain('<script>alert("x")</script>');
    });
});
