import { inputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { DEMO_USERS } from '../../demo-users';
import type { DemoUser } from '../../auth.types';
import { DemoLoginComponent } from './demo-login.component';

describe('DemoLoginComponent', () => {
    const busy = signal(false);

    function create() {
        const fixture = TestBed.createComponent(DemoLoginComponent, {
            bindings: [
                inputBinding('users', () => DEMO_USERS),
                inputBinding('busy', busy),
            ],
        });
        fixture.detectChanges();
        const emitted: DemoUser[] = [];
        fixture.componentInstance.selected.subscribe((v) => emitted.push(v));
        const buttons = [
            ...(fixture.nativeElement as HTMLElement).querySelectorAll(
                'button',
            ),
        ];
        return { emitted, buttons };
    }

    beforeEach(() => {
        busy.set(false);
        TestBed.configureTestingModule({
            providers: [
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
            ],
        });
    });

    it('offers one button per demo user and emits the clicked one', () => {
        const { emitted, buttons } = create();

        expect(buttons).toHaveLength(2);
        buttons[1]!.click();

        expect(emitted).toEqual([DEMO_USERS[1]]);
    });

    it('disables the buttons while busy', () => {
        busy.set(true);
        const { buttons } = create();

        expect(buttons.every((b) => b.disabled)).toBe(true);
    });
});
