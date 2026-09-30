import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAppIcons } from '../../../../core/icons/icons';
import type { InvitationDto } from '../../household.types';
import { InvitationListComponent } from './invitation-list.component';

const invitation = (id: string, note: string | null): InvitationDto => ({
    id,
    note,
    createdAt: '2026-09-30T10:00:00.000Z',
    expiresAt: '2026-10-01T10:00:00.000Z',
});

describe('InvitationListComponent', () => {
    const invitations = signal<InvitationDto[]>([]);

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                provideAppIcons(),
            ],
        });
    });

    function create() {
        const fixture = TestBed.createComponent(InvitationListComponent, {
            bindings: [inputBinding('invitations', invitations)],
        });
        fixture.detectChanges();
        const revoked: string[] = [];
        fixture.componentInstance.revoke.subscribe((id) => revoked.push(id));
        return { el: fixture.nativeElement as HTMLElement, revoked };
    }

    it('says so when there is no open invitation', () => {
        invitations.set([]);
        const { el } = create();
        expect(el.textContent).toContain('members.invitations.empty');
        expect(el.querySelector('ul')).toBeNull();
    });

    it('shows the note, or a placeholder without one', () => {
        invitations.set([invitation('i1', 'For Anna'), invitation('i2', null)]);
        const { el } = create();
        const rows = [...el.querySelectorAll('li')].map((li) => li.textContent);
        expect(rows[0]).toContain('For Anna');
        expect(rows[1]).toContain('members.invitations.noNote');
        expect(rows[0]).toContain('members.invitations.validUntil');
    });

    it('emits the id of the invitation to revoke', () => {
        invitations.set([invitation('i1', null), invitation('i2', null)]);
        const { el, revoked } = create();
        el.querySelectorAll('button')[1].click();
        expect(revoked).toEqual(['i2']);
    });
});
