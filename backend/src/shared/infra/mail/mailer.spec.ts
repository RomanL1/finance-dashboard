import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fileTransport, resendTransport } from './mailer.js';

const send = vi.fn();
vi.mock('resend', () => ({
    Resend: class {
        emails = { send };
    },
}));

const mail = {
    to: 'a@finance.local',
    subject: 'Hi',
    html: '<p>Hi</p>',
    text: 'Hi',
};

describe('resendTransport', () => {
    afterEach(() => send.mockReset());

    it('sends from the configured sender', async () => {
        send.mockResolvedValue({ data: { id: '1' }, error: null });
        await resendTransport('key', 'App <noreply@app.example>')(mail);
        expect(send).toHaveBeenCalledWith({
            from: 'App <noreply@app.example>',
            ...mail,
        });
    });

    it('throws when Resend reports an error', async () => {
        send.mockResolvedValue({
            data: null,
            error: { message: 'domain not verified' },
        });
        await expect(resendTransport('key', 'x')(mail)).rejects.toThrow(
            'domain not verified',
        );
    });
});

describe('fileTransport', () => {
    let dir: string | undefined;
    afterEach(async () => {
        if (dir) await rm(dir, { recursive: true, force: true });
    });

    it('writes each mail as a JSON file, creating the directory', async () => {
        dir = await mkdtemp(join(tmpdir(), 'mail-'));
        const outbox = join(dir, 'outbox');
        await fileTransport(outbox)(mail);
        const [file] = await readdir(outbox);
        expect(JSON.parse(await readFile(join(outbox, file!), 'utf8'))).toEqual(
            mail,
        );
    });
});
