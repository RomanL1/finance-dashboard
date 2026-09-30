import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAppIcons } from '../../../../core/icons/icons';
import type { HouseholdMemberDto } from '../../household.types';
import { MemberListComponent } from './member-list.component';

const member = (
    userId: string,
    role: HouseholdMemberDto['role'],
): HouseholdMemberDto => ({
    userId,
    name: `Name ${userId}`,
    email: `${userId}@b.c`,
    role,
    joinedAt: '2026-01-01T00:00:00.000Z',
});

describe('MemberListComponent', () => {
    const members = signal<HouseholdMemberDto[]>([]);
    const canRemove = signal(false);

    beforeEach(() => {
        members.set([member('u1', 'owner'), member('u2', 'member')]);
        canRemove.set(false);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                provideAppIcons(),
            ],
        });
    });

    function create() {
        const fixture = TestBed.createComponent(MemberListComponent, {
            bindings: [
                inputBinding('members', members),
                inputBinding('canRemove', canRemove),
            ],
        });
        fixture.detectChanges();
        const removed: string[] = [];
        fixture.componentInstance.remove.subscribe((id) => removed.push(id));
        return { el: fixture.nativeElement as HTMLElement, removed };
    }

    it('shows name, email and role of everyone', () => {
        const { el } = create();
        const rows = [...el.querySelectorAll('li')].map((li) => li.textContent);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toContain('Name u1');
        expect(rows[0]).toContain('u1@b.c');
        expect(rows[0]).toContain('settings.household.roles.owner');
        expect(rows[1]).toContain('settings.household.roles.member');
    });

    it('offers no remove button to a member', () => {
        const { el } = create();
        expect(el.querySelectorAll('button')).toHaveLength(0);
    });

    it('lets the owner remove members but never the owner', () => {
        canRemove.set(true);
        const { el, removed } = create();

        const buttons = el.querySelectorAll('button');
        expect(buttons).toHaveLength(1);
        expect(el.querySelectorAll('li')[0].querySelector('button')).toBeNull();

        buttons[0].click();
        expect(removed).toEqual(['u2']);
    });
});
