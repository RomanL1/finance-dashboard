import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/shared/infra/app.setup.js';
import { CLOCK, type Clock } from '../src/shared/kernel/index.js';
import { prepareTestDb } from './setup-db.js';
import { listenOnLoopback } from './setup-app.js';
import { signUpVerified } from './support/auth.js';

/** Invitation links, joining, the member list and removing a member, across two households of one user. */
describe('members and invitations (e2e)', () => {
    let app: INestApplication;
    let owner: string;
    let anna: string;
    let ben: string;
    let householdId: string;
    const clock = { current: new Date('2026-09-30T10:00:00.000Z') };

    const server = () => request(app.getHttpServer());
    const account = {
        description: 'Checking',
        currency: 'CHF',
        type: 'checking',
        initialValue: 100000,
        startDate: '2026-01-01',
    };

    const signUp = (name: string) =>
        signUpVerified(app, {
            name,
            email: `${name.toLowerCase()}@invite.local`,
            password: 'password-123',
        });

    async function onboard(cookie: string, name: string): Promise<string> {
        const res = await server()
            .post('/api/households/onboarding')
            .set('Cookie', cookie)
            .send({ name, categoryNames: ['Food'], accounts: [account] })
            .expect(201);
        return res.body.id;
    }

    const invitations = (cookie = owner, id = householdId) => ({
        create: (body: object = {}) =>
            server()
                .post(`/api/households/${id}/invitations`)
                .set('Cookie', cookie)
                .send(body),
        list: () =>
            server()
                .get(`/api/households/${id}/invitations`)
                .set('Cookie', cookie),
        revoke: (invitationId: string) =>
            server()
                .delete(`/api/households/${id}/invitations/${invitationId}`)
                .set('Cookie', cookie),
    });

    const preview = (token: string) =>
        server().get(`/api/invitations/${token}`);
    const accept = (token: string, cookie: string) =>
        server().post(`/api/invitations/${token}/accept`).set('Cookie', cookie);
    const members = (cookie: string, id = householdId) =>
        server().get(`/api/households/${id}/members`).set('Cookie', cookie);
    const households = (cookie: string) =>
        server().get('/api/households').set('Cookie', cookie);

    async function newToken(note?: string): Promise<string> {
        const res = await invitations().create({ note }).expect(201);
        return res.body.token;
    }

    async function userId(cookie: string): Promise<string> {
        const res = await server()
            .get('/api/auth/get-session')
            .set('Cookie', cookie)
            .expect(200);
        return res.body.user.id;
    }

    beforeAll(async () => {
        await prepareTestDb();
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(CLOCK)
            .useValue({ now: () => clock.current } satisfies Clock)
            .compile();
        app = setupApp(moduleRef.createNestApplication());
        await listenOnLoopback(app);

        owner = await signUp('Olga');
        anna = await signUp('Anna');
        ben = await signUp('Ben');
        householdId = await onboard(owner, 'Home');
    });

    afterAll(() => app?.close());

    describe('creating and listing', () => {
        it('returns the token once and lists the invitation without it', async () => {
            const created = await invitations()
                .create({ note: '  For Anna ' })
                .expect(201);
            expect(created.body).toMatchObject({
                note: 'For Anna',
                expiresAt: '2026-10-01T10:00:00.000Z',
            });
            expect(created.body.token).toMatch(/^[\w-]{43}$/);

            const list = await invitations().list().expect(200);
            expect(list.body).toHaveLength(1);
            expect(list.body[0]).toMatchObject({
                id: created.body.id,
                note: 'For Anna',
            });
            expect(list.body[0]).not.toHaveProperty('token');
            expect(JSON.stringify(list.body)).not.toContain(created.body.token);

            await invitations().revoke(created.body.id).expect(204);
        });

        it('accepts a 50 character note and rejects 51', async () => {
            const ok = await invitations()
                .create({ note: 'x'.repeat(50) })
                .expect(201);
            await invitations().revoke(ok.body.id).expect(204);
            await invitations()
                .create({ note: 'x'.repeat(51) })
                .expect(400);
        });

        it('caps open invitations at ten; revoking frees a slot', async () => {
            const ids: string[] = [];
            for (let i = 0; i < 10; i++) {
                const res = await invitations().create().expect(201);
                ids.push(res.body.id);
            }
            await invitations().create().expect(409);

            await invitations().revoke(ids[0]!).expect(204);
            const again = await invitations().create().expect(201);
            ids[0] = again.body.id;

            for (const id of ids) await invitations().revoke(id).expect(204);
            expect((await invitations().list().expect(200)).body).toEqual([]);
        });

        it('expired invitations no longer count against the cap', async () => {
            const start = clock.current;
            for (let i = 0; i < 10; i++)
                await invitations().create().expect(201);

            clock.current = new Date(start.getTime() + 24 * 60 * 60 * 1000);
            expect((await invitations().list().expect(200)).body).toEqual([]);
            const fresh = await invitations().create().expect(201);
            await invitations().revoke(fresh.body.id).expect(204);
            clock.current = start;
        });

        it('revoking an unknown invitation is 404', async () => {
            await invitations().revoke('nope').expect(404);
        });

        it('needs a session', async () => {
            await server()
                .get(`/api/households/${householdId}/invitations`)
                .expect(401);
            await server()
                .post(`/api/households/${householdId}/invitations`)
                .send({})
                .expect(401);
        });

        it('is closed to users outside the household', async () => {
            await invitations(anna).list().expect(403);
            await invitations(anna).create().expect(403);
            await invitations(anna).revoke('any').expect(403);
        });
    });

    describe('the link', () => {
        it('shows household and owner name without a session', async () => {
            const token = await newToken();
            const res = await preview(token).expect(200);
            expect(res.body).toEqual({
                householdName: 'Home',
                ownerName: 'Olga',
            });
        });

        it('accepting needs a session and leaves the link usable', async () => {
            const token = await newToken();
            await server().post(`/api/invitations/${token}/accept`).expect(401);
            await preview(token).expect(200);
        });

        it('an unknown token is 404 for preview and accept', async () => {
            await preview('unknown-token').expect(404);
            await accept('unknown-token', anna).expect(404);
        });

        it('is valid until just before 24 hours and invalid from then on', async () => {
            const start = clock.current;
            const token = await newToken();

            clock.current = new Date(
                start.getTime() + 24 * 60 * 60 * 1000 - 1000,
            );
            await preview(token).expect(200);

            clock.current = new Date(start.getTime() + 24 * 60 * 60 * 1000);
            await preview(token).expect(404);
            await accept(token, anna).expect(404);
            expect((await households(anna).expect(200)).body).toEqual([]);
            clock.current = start;
        });

        it('a revoked link is 404', async () => {
            const created = await invitations().create().expect(201);
            await invitations().revoke(created.body.id).expect(204);
            await preview(created.body.token).expect(404);
            await accept(created.body.token, anna).expect(404);
        });
    });

    describe('joining', () => {
        let token: string;

        it('adds the user as member and uses the link up', async () => {
            token = await newToken('Anna');
            const res = await accept(token, anna).expect(200);
            expect(res.body).toMatchObject({
                id: householdId,
                name: 'Home',
                role: 'member',
            });

            await preview(token).expect(404);
            const open = await invitations().list().expect(200);
            expect(
                open.body.filter((i: { note: string }) => i.note === 'Anna'),
            ).toEqual([]);
        });

        it('a used link lets nobody else in', async () => {
            await accept(token, ben).expect(404);
            expect((await households(ben).expect(200)).body).toEqual([]);
        });

        it('the new member reaches the household data without onboarding', async () => {
            const mine = await households(anna).expect(200);
            expect(mine.body).toHaveLength(1);
            expect(mine.body[0]).toMatchObject({
                id: householdId,
                role: 'member',
                onboardingComplete: true,
            });
            const accounts = await server()
                .get(`/api/households/${householdId}/accounts`)
                .set('Cookie', anna)
                .expect(200);
            expect(accounts.body).toHaveLength(1);
        });

        it('lists owner first, then members, with name and email', async () => {
            const res = await members(anna).expect(200);
            expect(
                res.body.map(
                    (m: { name: string; email: string; role: string }) => [
                        m.name,
                        m.email,
                        m.role,
                    ],
                ),
            ).toEqual([
                ['Olga', 'olga@invite.local', 'owner'],
                ['Anna', 'anna@invite.local', 'member'],
            ]);
        });

        it('a member cannot invite, list invitations, revoke or remove', async () => {
            await invitations(anna).create().expect(403);
            await invitations(anna).list().expect(403);
            await invitations(anna).revoke('any').expect(403);
            await server()
                .delete(
                    `/api/households/${householdId}/members/${await userId(owner)}`,
                )
                .set('Cookie', anna)
                .expect(403);
        });

        it('an existing member opening another link keeps it unused', async () => {
            const other = await newToken();
            const res = await accept(other, anna).expect(200);
            expect(res.body).toMatchObject({ id: householdId, role: 'member' });
            const asOwner = await accept(other, owner).expect(200);
            expect(asOwner.body.role).toBe('owner');
            await preview(other).expect(200);
            expect((await members(owner).expect(200)).body).toHaveLength(2);
        });

        it('two people accepting the same link at once: exactly one joins', async () => {
            const cara = await signUp('Cara');
            const shared = await newToken();
            const results = await Promise.all([
                accept(shared, ben),
                accept(shared, cara),
            ]);
            expect(results.map((r) => r.status).sort()).toEqual([200, 404]);
            expect((await members(owner).expect(200)).body).toHaveLength(3);
        });
    });

    describe('several households', () => {
        it('a member can also own a household; oldest membership comes first', async () => {
            const ownId = await onboard(anna, 'Anna solo');
            const mine = await households(anna).expect(200);
            expect(
                mine.body.map((h: { id: string; role: string }) => [
                    h.id,
                    h.role,
                ]),
            ).toEqual([
                [householdId, 'member'],
                [ownId, 'owner'],
            ]);
            // Owner of one household is still only a member in the other.
            await invitations(anna, ownId).create().expect(201);
            await invitations(anna).create().expect(403);
            await members(owner, ownId).expect(403);
        });

        it('an invitation of one household cannot be revoked through another', async () => {
            const created = await invitations().create().expect(201);
            const annasHousehold = (await households(anna).expect(200)).body[1]
                .id;
            await invitations(anna, annasHousehold)
                .revoke(created.body.id)
                .expect(404);
            await preview(created.body.token).expect(200);
        });
    });

    describe('removing a member', () => {
        const remove = (cookie: string, target: string) =>
            server()
                .delete(`/api/households/${householdId}/members/${target}`)
                .set('Cookie', cookie);

        it('the owner cannot remove themselves', async () => {
            await remove(owner, await userId(owner)).expect(400);
            expect((await members(owner).expect(200)).body[0].role).toBe(
                'owner',
            );
        });

        it('removing someone who is not a member is 404', async () => {
            await remove(owner, 'nobody').expect(404);
        });

        it('locks the removed member out and keeps their transactions', async () => {
            const accounts = await server()
                .get(`/api/households/${householdId}/accounts`)
                .set('Cookie', anna)
                .expect(200);
            await server()
                .post(`/api/households/${householdId}/transactions`)
                .set('Cookie', anna)
                .send({
                    accountId: accounts.body[0].id,
                    type: 'expense',
                    amount: 500,
                    title: 'By Anna',
                    date: '2026-09-01T12:00:00.000Z',
                })
                .expect(201);

            await remove(owner, await userId(anna)).expect(204);

            await members(anna).expect(403);
            await server()
                .get(`/api/households/${householdId}/accounts`)
                .set('Cookie', anna)
                .expect(403);
            const left = await households(anna).expect(200);
            expect(left.body.map((h: { name: string }) => h.name)).toEqual([
                'Anna solo',
            ]);

            const list = await server()
                .get(`/api/households/${householdId}/transactions`)
                .set('Cookie', owner)
                .expect(200);
            expect(JSON.stringify(list.body)).toContain('By Anna');
        });

        it('removing twice is 404', async () => {
            await remove(owner, await userId(anna)).expect(404);
        });

        it('a removed member can join again with a fresh link', async () => {
            const res = await accept(await newToken(), anna).expect(200);
            expect(res.body).toMatchObject({ id: householdId, role: 'member' });
        });
    });
});
