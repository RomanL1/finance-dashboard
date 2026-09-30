import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { provideAppIcons } from '../../../../core/icons/icons';
import type { HouseholdDto } from '../../household.types';
import { HouseholdSwitcherComponent } from './household-switcher.component';

const household = (id: string, role: HouseholdDto['role']): HouseholdDto => ({
    id,
    name: `Household ${id}`,
    role,
    onboardingComplete: true,
    baseCurrency: 'CHF',
    timeZone: 'Europe/Zurich',
    createdAt: '2026-01-01T00:00:00.000Z',
});

describe('HouseholdSwitcherComponent', () => {
    const households = signal<HouseholdDto[]>([]);
    const activeId = signal('h1');

    beforeEach(() => {
        households.set([household('h1', 'owner'), household('h2', 'member')]);
        activeId.set('h1');
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                provideAppIcons(),
            ],
        });
    });

    function create() {
        const fixture = TestBed.createComponent(HouseholdSwitcherComponent, {
            bindings: [
                inputBinding('households', households),
                inputBinding('activeId', activeId),
            ],
        });
        fixture.detectChanges();
        const events: string[] = [];
        fixture.componentInstance.picked.subscribe((id) =>
            events.push(`picked:${id}`),
        );
        fixture.componentInstance.create.subscribe(() => events.push('create'));
        const el = fixture.nativeElement as HTMLElement;
        const rows = () => [
            ...el.querySelectorAll<HTMLButtonElement>('li button'),
        ];
        return { el, events, rows };
    }

    it('lists every household with the role and marks the active one', () => {
        const { rows } = create();

        expect(rows()).toHaveLength(2);
        expect(rows()[0].textContent).toContain('Household h1');
        expect(rows()[0].textContent).toContain(
            'settings.household.roles.owner',
        );
        expect(rows()[1].textContent).toContain(
            'settings.household.roles.member',
        );
        expect(rows()[0].getAttribute('aria-current')).toBe('true');
        expect(rows()[1].getAttribute('aria-current')).toBeNull();
        expect(rows()[0].querySelector('mat-icon')).not.toBeNull();
        expect(rows()[1].querySelector('mat-icon')).toBeNull();
    });

    it('emits the picked household, not the active one', () => {
        const { rows, events } = create();

        rows()[0].click();
        expect(events).toEqual([]);

        rows()[1].click();
        expect(events).toEqual(['picked:h2']);
    });

    it('emits create for a new household', () => {
        const { el, events } = create();
        el.querySelector<HTMLButtonElement>('app-button button')!.click();
        expect(events).toEqual(['create']);
    });
});
