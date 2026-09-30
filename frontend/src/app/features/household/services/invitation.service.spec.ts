import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { mockFetch, requestOf } from '../../../testing/fetch-mock';
import { InvitationService } from './invitation.service';

describe('InvitationService', () => {
    let service: InvitationService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: DOCUMENT,
                    useValue: { location: { origin: 'https://app.test' } },
                },
            ],
        });
        service = TestBed.inject(InvitationService);
    });

    afterEach(() => vi.restoreAllMocks());

    it('builds the link to the invite page', () => {
        expect(service.linkFor('tok')).toBe('https://app.test/invite/tok');
    });

    it('creates with the note', async () => {
        const fetch = mockFetch({ id: 'i1', token: 'tok' });

        await expect(service.create('h1', 'Anna')).resolves.toMatchObject({
            token: 'tok',
        });
        const request = requestOf(fetch);
        expect(request.method).toBe('POST');
        expect(new URL(request.url).pathname).toBe(
            '/api/households/h1/invitations',
        );
        await expect(request.json()).resolves.toEqual({ note: 'Anna' });
    });

    it('creates without a note when it is empty', async () => {
        const fetch = mockFetch({ id: 'i1', token: 'tok' });
        await service.create('h1', '');
        await expect(requestOf(fetch).json()).resolves.toEqual({});
    });

    it('lists and revokes by household', async () => {
        const list = mockFetch([{ id: 'i1' }]);
        await expect(service.list('h1')).resolves.toEqual([{ id: 'i1' }]);
        expect(new URL(requestOf(list).url).pathname).toBe(
            '/api/households/h1/invitations',
        );
        vi.restoreAllMocks();

        const revoke = mockFetch(null, 204);
        await service.revoke('h1', 'i1');
        expect(requestOf(revoke).method).toBe('DELETE');
        expect(new URL(requestOf(revoke).url).pathname).toBe(
            '/api/households/h1/invitations/i1',
        );
    });

    it('previews a valid link', async () => {
        const preview = { householdName: 'Home', ownerName: 'Olga' };
        const fetch = mockFetch(preview);
        await expect(service.preview('tok')).resolves.toEqual(preview);
        expect(new URL(requestOf(fetch).url).pathname).toBe(
            '/api/invitations/tok',
        );
    });

    it('resolves null for a link that is not valid', async () => {
        mockFetch({ message: 'Invitation not found' }, 404);
        await expect(service.preview('tok')).resolves.toBeNull();
        await expect(service.accept('tok')).resolves.toBeNull();
    });

    it('accepts with a POST and returns the household', async () => {
        const fetch = mockFetch({ id: 'h1', role: 'member' });
        await expect(service.accept('tok')).resolves.toEqual({
            id: 'h1',
            role: 'member',
        });
        const request = requestOf(fetch);
        expect(request.method).toBe('POST');
        expect(new URL(request.url).pathname).toBe(
            '/api/invitations/tok/accept',
        );
    });
});
