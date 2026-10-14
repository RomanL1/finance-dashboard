import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import type { CreateTransferDto } from '../transfer.types';
import { TransferService } from './transfer.service';

const body: CreateTransferDto = {
    fromAccountId: 'checking',
    toAccountId: 'card',
    amount: 2000,
    title: null,
    date: '2026-02-01T12:00:00.000Z',
};

describe('TransferService', () => {
    let service: TransferService;

    beforeEach(() => {
        localStorage.clear();
        service = TestBed.inject(TransferService);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('addresses every endpoint under the household', async () => {
        const fetch = mockFetch({ id: 't1' });

        await service.list('h1', 2, 10);
        await service.create('h1', body);
        await service.update('h1', 't1', body);

        const calls = [0, 1, 2].map((i) => {
            const request = requestOf(fetch, i);
            const url = new URL(request.url);
            return `${request.method} ${url.pathname}${url.search}`;
        });
        const base = '/api/households/h1/transfers';
        expect(calls).toEqual([
            `GET ${base}?page=2&pageSize=10`,
            `POST ${base}`,
            `PATCH ${base}/t1`,
        ]);
    });

    it('deletes by id', async () => {
        const fetch = mockFetch(null, 204);
        await service.delete('h1', 't1');
        const request = requestOf(fetch);
        expect(request.method).toBe('DELETE');
        expect(new URL(request.url).pathname).toBe(
            '/api/households/h1/transfers/t1',
        );
    });

    it('remembers the payer of a new transfer only', async () => {
        mockFetch({ id: 't1' });
        expect(service.lastPayer()).toBeUndefined();

        await service.update('h1', 't1', { ...body, fromAccountId: 'other' });
        expect(service.lastPayer()).toBeUndefined();

        await service.create('h1', body);
        expect(service.lastPayer()).toBe('checking');
    });
});
