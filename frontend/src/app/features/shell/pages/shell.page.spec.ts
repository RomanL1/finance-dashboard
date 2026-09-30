import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/auth/auth.service';
import { provideAppIcons } from '../../../core/icons/icons';
import { HouseholdService } from '../../household/services/household.service';
import { ShellPage } from './shell.page';

describe('ShellPage', () => {
    let takeSwitchNotice: ReturnType<typeof vi.fn>;
    let getHousehold: ReturnType<typeof vi.fn>;
    let open: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        takeSwitchNotice = vi.fn().mockReturnValue(false);
        getHousehold = vi.fn().mockResolvedValue({ name: 'Cabin' });
        open = vi.fn();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideTranslateService({ fallbackLang: 'en', lang: 'en' }),
                provideAppIcons(),
                { provide: AuthService, useValue: { user: signal(null) } },
                {
                    provide: HouseholdService,
                    useValue: { takeSwitchNotice, getHousehold },
                },
                { provide: MatSnackBar, useValue: { open } },
            ],
        });
    });

    async function create(): Promise<void> {
        const fixture = TestBed.createComponent(ShellPage);
        fixture.detectChanges();
        await fixture.whenStable();
    }

    it('confirms a household switch once the app is back', async () => {
        takeSwitchNotice.mockReturnValue(true);

        await create();

        expect(open).toHaveBeenCalledOnce();
        expect(open.mock.calls[0][0]).toBe('settings.households.switched');
        expect(open.mock.calls[0][2]).toMatchObject({ duration: 4000 });
    });

    it('stays quiet on an ordinary start', async () => {
        await create();

        expect(open).not.toHaveBeenCalled();
        expect(getHousehold).not.toHaveBeenCalled();
    });
});
