import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import { MemberService } from './member.service';

describe('MemberService', () => {
    afterEach(() => vi.restoreAllMocks());

    it('lists the members of the household', async () => {
        const fetch = mockFetch([{ userId: 'u1' }]);
        await expect(TestBed.inject(MemberService).list('h1')).resolves.toEqual(
            [{ userId: 'u1' }],
        );
        expect(new URL(requestOf(fetch).url).pathname).toBe(
            '/api/households/h1/members',
        );
    });

    it('removes one member', async () => {
        const fetch = mockFetch(null, 204);
        await TestBed.inject(MemberService).remove('h1', 'u2');
        expect(requestOf(fetch).method).toBe('DELETE');
        expect(new URL(requestOf(fetch).url).pathname).toBe(
            '/api/households/h1/members/u2',
        );
    });

    it('rejects when the server refuses', async () => {
        mockFetch({ message: 'Forbidden' }, 403);
        await expect(
            TestBed.inject(MemberService).remove('h1', 'u2'),
        ).rejects.toBeDefined();
    });
});
