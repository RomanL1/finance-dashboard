import { describe, expect, it, vi } from 'vitest';
import {
    NotFoundError,
    ValidationError,
} from '../../../shared/kernel/index.js';
import type { TransferRepository } from '../repository/transfer.repository.js';
import { TransferService } from './transfer.service.js';

const input = {
    fromAccountId: 'acc-1',
    toAccountId: 'card',
    amount: 50000,
    title: ' Card bill ',
    date: new Date('2026-03-01T12:00:00.000Z'),
};

type RepoFake = Pick<
    TransferRepository,
    | 'listByHouseholdId'
    | 'countByHouseholdId'
    | 'findAccounts'
    | 'createTransfer'
    | 'updateTransfer'
    | 'deleteTransfer'
>;

function makeRepo(overrides: Partial<RepoFake> = {}): RepoFake {
    return {
        listByHouseholdId: vi
            .fn<RepoFake['listByHouseholdId']>()
            .mockResolvedValue([]),
        countByHouseholdId: vi
            .fn<RepoFake['countByHouseholdId']>()
            .mockResolvedValue(0),
        findAccounts: vi.fn<RepoFake['findAccounts']>((_h, ids) =>
            Promise.resolve(ids.map((id) => ({ id, archivedAt: null }))),
        ),
        createTransfer: vi.fn<RepoFake['createTransfer']>((entity) =>
            Promise.resolve({ ...entity, createdAt: new Date() }),
        ),
        updateTransfer: vi.fn<RepoFake['updateTransfer']>((_h, entity) =>
            Promise.resolve({ ...entity, createdAt: new Date() }),
        ),
        deleteTransfer: vi
            .fn<RepoFake['deleteTransfer']>()
            .mockResolvedValue(true),
        ...overrides,
    };
}

function makeService(repo: RepoFake) {
    return new TransferService(repo as TransferRepository);
}

describe('TransferService.getPage', () => {
    it('offsets by page and reports total', async () => {
        const repo = makeRepo({
            listByHouseholdId: vi.fn().mockResolvedValue([{ id: 'tr-1' }]),
            countByHouseholdId: vi.fn().mockResolvedValue(120),
        });
        const filter = { accountId: 'card' };

        const page = await makeService(repo).getPage('h-1', filter, 3);

        expect(repo.listByHouseholdId).toHaveBeenCalledWith(
            'h-1',
            filter,
            50,
            100,
        );
        expect(repo.countByHouseholdId).toHaveBeenCalledWith('h-1', filter);
        expect(page).toEqual({
            items: [{ id: 'tr-1' }],
            total: 120,
            page: 3,
            pageSize: 50,
        });
    });

    it('honours an explicit page size', async () => {
        const repo = makeRepo();
        await makeService(repo).getPage('h-1', {}, 2, 10);
        expect(repo.listByHouseholdId).toHaveBeenCalledWith('h-1', {}, 10, 10);
    });
});

describe('TransferService.create', () => {
    it('checks both accounts in the household, trims the title, persists', async () => {
        const repo = makeRepo();
        const created = await makeService(repo).create('h-1', input);

        expect(created.title).toBe('Card bill');
        expect(repo.findAccounts).toHaveBeenCalledWith('h-1', [
            'acc-1',
            'card',
        ]);
        expect(repo.createTransfer).toHaveBeenCalledWith(
            expect.objectContaining({ id: expect.any(String), amount: 50000 }),
        );
    });

    it('throws NotFound when an account is not in the household', async () => {
        const repo = makeRepo({
            findAccounts: vi
                .fn()
                .mockResolvedValue([{ id: 'acc-1', archivedAt: null }]),
        });
        await expect(
            makeService(repo).create('h-1', input),
        ).rejects.toBeInstanceOf(NotFoundError);
        expect(repo.createTransfer).not.toHaveBeenCalled();
    });

    it('rejects an account archived at the transfer date', async () => {
        const repo = makeRepo({
            findAccounts: vi.fn().mockResolvedValue([
                { id: 'acc-1', archivedAt: null },
                { id: 'card', archivedAt: new Date('2026-02-01') },
            ]),
        });
        await expect(
            makeService(repo).create('h-1', input),
        ).rejects.toBeInstanceOf(ValidationError);
        expect(repo.createTransfer).not.toHaveBeenCalled();
    });

    it('accepts an account archived after the transfer date', async () => {
        const repo = makeRepo({
            findAccounts: vi.fn().mockResolvedValue([
                { id: 'acc-1', archivedAt: new Date('2026-04-01') },
                { id: 'card', archivedAt: null },
            ]),
        });
        await makeService(repo).create('h-1', input);
        expect(repo.createTransfer).toHaveBeenCalled();
    });

    it('rejects the same account on both sides before touching the repository', async () => {
        const repo = makeRepo();
        await expect(
            makeService(repo).create('h-1', { ...input, toAccountId: 'acc-1' }),
        ).rejects.toBeInstanceOf(ValidationError);
        expect(repo.findAccounts).not.toHaveBeenCalled();
    });
});

describe('TransferService.update', () => {
    it('keeps the id and replaces the rest', async () => {
        const repo = makeRepo();
        const updated = await makeService(repo).update('h-1', 'tr-1', {
            ...input,
            amount: 100,
        });
        expect(updated).toMatchObject({ id: 'tr-1', amount: 100 });
        expect(repo.updateTransfer).toHaveBeenCalledWith(
            'h-1',
            expect.objectContaining({ id: 'tr-1' }),
        );
    });

    it('throws NotFound for a transfer outside the household', async () => {
        const repo = makeRepo({
            updateTransfer: vi.fn().mockResolvedValue(null),
        });
        await expect(
            makeService(repo).update('h-1', 'tr-x', input),
        ).rejects.toBeInstanceOf(NotFoundError);
    });
});

describe('TransferService.delete', () => {
    it('throws NotFound when nothing was deleted', async () => {
        const repo = makeRepo({
            deleteTransfer: vi.fn().mockResolvedValue(false),
        });
        await expect(
            makeService(repo).delete('h-1', 'tr-x'),
        ).rejects.toBeInstanceOf(NotFoundError);
    });
});
