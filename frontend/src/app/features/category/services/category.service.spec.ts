import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
    let service: CategoryService;

    beforeEach(() => {
        service = TestBed.inject(CategoryService);
    });

    afterEach(() => vi.restoreAllMocks());

    it('lists the categories of the household', async () => {
        const fetch = mockFetch([{ id: 'c1', name: 'Food' }]);

        await expect(service.list('h1')).resolves.toEqual([
            { id: 'c1', name: 'Food' },
        ]);
        const request = requestOf(fetch);
        expect(request.method).toBe('GET');
        expect(new URL(request.url).pathname).toBe(
            '/api/households/h1/categories',
        );
    });

    it('creates and renames with the name in the body', async () => {
        const fetch = mockFetch({ id: 'c1', name: 'Food' });

        await service.create('h1', { name: 'Food' });
        await service.rename('h1', 'c1', { name: 'Groceries' });

        expect(requestOf(fetch, 0).method).toBe('POST');
        await expect(requestOf(fetch, 0).json()).resolves.toEqual({
            name: 'Food',
        });
        const rename = requestOf(fetch, 1);
        expect(rename.method).toBe('PATCH');
        expect(new URL(rename.url).pathname).toBe(
            '/api/households/h1/categories/c1',
        );
        await expect(rename.json()).resolves.toEqual({ name: 'Groceries' });
    });

    it('deletes with a transfer target only when one is given', async () => {
        const fetch = mockFetch(null, 204);

        await service.delete('h1', 'c1');
        await service.delete('h1', 'c1', 'c2');

        expect(requestOf(fetch, 0).method).toBe('DELETE');
        expect(new URL(requestOf(fetch, 0).url).search).toBe('');
        expect(
            new URL(requestOf(fetch, 1).url).searchParams.get('transferTo'),
        ).toBe('c2');
    });

    it('rejects when the server refuses', async () => {
        mockFetch({ message: 'taken' }, 409);

        await expect(service.create('h1', { name: 'Food' })).rejects.toEqual({
            message: 'taken',
        });
    });
});
