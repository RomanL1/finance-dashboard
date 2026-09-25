import { describe, expect, it, vi } from 'vitest';
import type { Account } from '../model/account.js';
import type { AccountService } from '../service/account.service.js';
import { AccountController } from './account.controller.js';

const saved: Account = {
    id: 'acc-1',
    householdId: 'h-1',
    number: 1,
    description: 'Checking',
    type: 'checking',
    currency: 'CHF',
    initialValue: 1000,
    amount: 1000,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    archivedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

function makeController() {
    const service: Pick<AccountService, 'create' | 'update'> = {
        create: vi.fn<AccountService['create']>().mockResolvedValue(saved),
        update: vi.fn<AccountService['update']>().mockResolvedValue(saved),
    };
    return {
        controller: new AccountController(service as AccountService),
        service,
    };
}

const editable = {
    description: 'Checking',
    type: 'checking' as const,
    currency: 'CHF' as const,
    startDate: '2026-01-01T00:00:00.000Z',
};

describe('AccountController', () => {
    it('parses the start date on create', async () => {
        const { controller, service } = makeController();

        const dto = await controller.createAccount('h-1', {
            ...editable,
            initialValue: 1000,
        });

        expect(service.create).toHaveBeenCalledWith('h-1', {
            ...editable,
            initialValue: 1000,
            startDate: new Date(editable.startDate),
        });
        expect(dto.startDate).toBe(editable.startDate);
    });

    it('parses the archive date on update', async () => {
        const { controller, service } = makeController();

        await controller.updateAccount('h-1', 'acc-1', {
            ...editable,
            archivedAt: '2026-06-01T00:00:00.000Z',
        });

        expect(service.update).toHaveBeenCalledWith('h-1', 'acc-1', {
            ...editable,
            startDate: new Date(editable.startDate),
            archivedAt: new Date('2026-06-01T00:00:00.000Z'),
        });
    });

    it.each([null, undefined])(
        'reads a %s archive date as unarchived',
        async (archivedAt) => {
            const { controller, service } = makeController();

            await controller.updateAccount('h-1', 'acc-1', {
                ...editable,
                archivedAt,
            });

            expect(vi.mocked(service.update).mock.calls[0][2].archivedAt).toBe(
                null,
            );
        },
    );
});
