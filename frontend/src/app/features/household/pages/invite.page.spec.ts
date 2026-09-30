import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { HouseholdService } from '../services/household.service';
import { InvitationService } from '../services/invitation.service';
import { InvitePage } from './invite.page';

describe('InvitePage', () => {
    const ready = signal(true);
    const isAuthenticated = signal(false);
    const token = signal('tok');
    let refresh: ReturnType<typeof vi.fn>;
    let preview: ReturnType<typeof vi.fn>;
    let accept: ReturnType<typeof vi.fn>;
    let switchTo: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        ready.set(true);
        isAuthenticated.set(false);
        refresh = vi.fn(async () => ready.set(true));
        preview = vi
            .fn()
            .mockResolvedValue({ householdName: 'Home', ownerName: 'Olga' });
        accept = vi.fn().mockResolvedValue({ id: 'h1' });
        switchTo = vi.fn();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                {
                    provide: AuthService,
                    useValue: { ready, isAuthenticated, refresh },
                },
                { provide: InvitationService, useValue: { preview, accept } },
                { provide: HouseholdService, useValue: { switchTo } },
            ],
        });
    });

    async function create() {
        const fixture = TestBed.createComponent(InvitePage, {
            bindings: [inputBinding('token', token)],
        });
        await fixture.whenStable();
        fixture.detectChanges();
        return {
            fixture,
            page: fixture.componentInstance,
            el: fixture.nativeElement as HTMLElement,
        };
    }

    const hrefs = (el: HTMLElement) =>
        [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    it('opening the link only looks at the invitation', async () => {
        isAuthenticated.set(true);
        await create();

        expect(preview).toHaveBeenCalledWith('tok');
        expect(accept).not.toHaveBeenCalled();
    });

    it('loads the session first when it is not known yet', async () => {
        ready.set(false);
        await create();
        expect(refresh).toHaveBeenCalledOnce();
    });

    it('sends a signed-out visitor to login or sign-up with the token', async () => {
        const { el } = await create();

        expect(el.textContent).toContain('invite.message');
        expect(el.querySelector('app-button')).toBeNull();
        expect(hrefs(el)).toEqual(['/login?invite=tok', '/signup?invite=tok']);
    });

    it('joins on the button and makes the household active', async () => {
        isAuthenticated.set(true);
        const { el, fixture } = await create();
        expect(hrefs(el)).toEqual([]);

        el.querySelector<HTMLButtonElement>('app-button button')!.click();
        await fixture.whenStable();

        expect(accept).toHaveBeenCalledWith('tok');
        expect(switchTo).toHaveBeenCalledWith('h1');
    });

    it('shows one message for a link that is not valid', async () => {
        preview.mockResolvedValue(null);
        const { el } = await create();

        expect(el.querySelector('[role="alert"]')?.textContent).toContain(
            'invite.invalid',
        );
        expect(el.querySelector('app-button')).toBeNull();
    });

    it('shows the same message when someone else used the link first', async () => {
        isAuthenticated.set(true);
        accept.mockResolvedValue(null);
        const { page, fixture, el } = await create();

        await page.join();
        fixture.detectChanges();

        expect(switchTo).not.toHaveBeenCalled();
        expect(el.querySelector('[role="alert"]')?.textContent).toContain(
            'invite.invalid',
        );
        expect(page.busy()).toBe(false);
    });
});
