import { Clipboard } from '@angular/cdk/clipboard';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { DialogService } from '../../../components/dialog/dialog.service';
import { provideAppIcons } from '../../../core/icons/icons';
import { HouseholdService } from '../services/household.service';
import { InvitationService } from '../services/invitation.service';
import { MemberService } from '../services/member.service';
import { MembersPage } from './members.page';

const members = [
    {
        userId: 'u1',
        name: 'Olga',
        email: 'olga@b.c',
        role: 'owner',
        joinedAt: '2026-01-01T00:00:00.000Z',
    },
    {
        userId: 'u2',
        name: 'Anna',
        email: 'anna@b.c',
        role: 'member',
        joinedAt: '2026-02-01T00:00:00.000Z',
    },
];

describe('MembersPage', () => {
    let role: 'owner' | 'member';
    let memberService: Record<string, ReturnType<typeof vi.fn>>;
    let invitationService: Record<string, ReturnType<typeof vi.fn>>;
    let confirm: ReturnType<typeof vi.fn>;
    let copy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        role = 'owner';
        memberService = {
            list: vi.fn().mockResolvedValue(members),
            remove: vi.fn().mockResolvedValue(undefined),
        };
        invitationService = {
            list: vi.fn().mockResolvedValue([]),
            create: vi.fn().mockResolvedValue({ id: 'i1', token: 'tok' }),
            revoke: vi.fn().mockResolvedValue(undefined),
            linkFor: vi.fn(
                (token: string) => `https://app.test/invite/${token}`,
            ),
        };
        confirm = vi.fn().mockResolvedValue(true);
        copy = vi.fn().mockReturnValue(true);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                provideAppIcons(),
                {
                    provide: HouseholdService,
                    useValue: {
                        getHousehold: () =>
                            Promise.resolve({ id: 'h1', name: 'Home', role }),
                    },
                },
                { provide: MemberService, useValue: memberService },
                { provide: InvitationService, useValue: invitationService },
                { provide: DialogService, useValue: { confirm } },
                { provide: Clipboard, useValue: { copy } },
            ],
        });
    });

    async function create() {
        const fixture = TestBed.createComponent(MembersPage);
        await fixture.whenStable();
        fixture.detectChanges();
        const settle = async () => {
            await fixture.whenStable();
            fixture.detectChanges();
        };
        return {
            fixture,
            settle,
            page: fixture.componentInstance,
            el: fixture.nativeElement as HTMLElement,
        };
    }

    const link = (el: HTMLElement) =>
        el
            .querySelector('[data-testid="invitation-link"]')
            ?.textContent?.trim();

    it('shows a member the list only: no invitations, no remove', async () => {
        role = 'member';
        const { el } = await create();

        expect(el.querySelectorAll('app-member-list li')).toHaveLength(2);
        expect(el.querySelector('app-invitation-form')).toBeNull();
        expect(el.querySelector('app-invitation-list')).toBeNull();
        expect(el.querySelector('app-member-list button')).toBeNull();
        expect(invitationService['list']).not.toHaveBeenCalled();
    });

    it('shows the owner invitations and a remove button per member', async () => {
        const { el } = await create();

        expect(el.querySelector('app-invitation-form')).not.toBeNull();
        expect(el.querySelectorAll('app-member-list button')).toHaveLength(1);
        expect(invitationService['list']).toHaveBeenCalledWith('h1');
        expect(link(el)).toBeUndefined();
    });

    it('links back to settings', async () => {
        const { el } = await create();
        expect(el.querySelector('header a')?.getAttribute('href')).toBe(
            '/settings',
        );
    });

    it('creates an invitation, shows its link and reloads the open list', async () => {
        const { page, el, settle } = await create();

        await page.createInvitation('h1', 'Anna');
        await settle();

        expect(invitationService['create']).toHaveBeenCalledWith('h1', 'Anna');
        expect(link(el)).toBe('https://app.test/invite/tok');
        expect(invitationService['list']).toHaveBeenCalledTimes(2);
        expect(page.busy()).toBe(false);
    });

    it('copies the link and says so', async () => {
        const { page, el, settle } = await create();
        await page.createInvitation('h1', '');
        await settle();

        el.querySelector<HTMLButtonElement>(
            '[role="status"] app-button button',
        )!.click();
        await settle();

        expect(copy).toHaveBeenCalledWith('https://app.test/invite/tok');
        expect(page.copied()).toBe(true);
        expect(el.textContent).toContain('members.invitations.copied');
    });

    it('a new link starts uncopied again', async () => {
        const { page } = await create();
        await page.createInvitation('h1', '');
        page.copy('x');

        await page.createInvitation('h1', '');

        expect(page.copied()).toBe(false);
    });

    it('explains a refused creation and shows no link', async () => {
        invitationService['create'].mockRejectedValue({ statusCode: 409 });
        const { page, el, settle } = await create();

        await page.createInvitation('h1', '');
        await settle();

        expect(page.error()).toBe('members.invitations.createFailed');
        expect(link(el)).toBeUndefined();
        expect(page.busy()).toBe(false);
    });

    it('revokes after confirmation and hides the link on screen', async () => {
        const { page, el, settle } = await create();
        await page.createInvitation('h1', '');
        await settle();
        expect(link(el)).toBeDefined();

        await page.revokeInvitation('h1', 'i1');
        await settle();

        expect(invitationService['revoke']).toHaveBeenCalledWith('h1', 'i1');
        expect(link(el)).toBeUndefined();
        expect(invitationService['list']).toHaveBeenCalledTimes(3);
    });

    it('keeps the invitation when the confirmation is declined', async () => {
        confirm.mockResolvedValue(false);
        const { page } = await create();

        await page.revokeInvitation('h1', 'i1');

        expect(invitationService['revoke']).not.toHaveBeenCalled();
    });

    it('removes a member after confirmation and reloads the list', async () => {
        const { page, settle } = await create();

        await page.removeMember('h1', 'u2');
        await settle();

        expect(memberService['remove']).toHaveBeenCalledWith('h1', 'u2');
        expect(memberService['list']).toHaveBeenCalledTimes(2);
    });

    it('keeps the member when the confirmation is declined', async () => {
        confirm.mockResolvedValue(false);
        const { page } = await create();

        await page.removeMember('h1', 'u2');

        expect(memberService['remove']).not.toHaveBeenCalled();
    });
});
