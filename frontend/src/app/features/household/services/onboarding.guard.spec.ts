import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { HouseholdService } from './household.service';
import { OnboardingCompleteGuard, OnboardingGuard } from './onboarding.guard';

describe('onboarding guards', () => {
    let getHouseholdOrNull: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        getHouseholdOrNull = vi.fn();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: HouseholdService, useValue: { getHouseholdOrNull } },
            ],
        });
    });

    const url = (result: boolean | UrlTree): string =>
        TestBed.inject(Router).serializeUrl(result as UrlTree);

    describe('OnboardingGuard', () => {
        it('lets a finished household through', async () => {
            getHouseholdOrNull.mockResolvedValue({ onboardingComplete: true });
            await expect(
                TestBed.inject(OnboardingGuard).canActivate(),
            ).resolves.toBe(true);
        });

        it.each([null, { onboardingComplete: false }])(
            'sends %j to onboarding',
            async (household) => {
                getHouseholdOrNull.mockResolvedValue(household);
                const result =
                    await TestBed.inject(OnboardingGuard).canActivate();
                expect(url(result)).toBe('/onboarding');
            },
        );
    });

    describe('OnboardingCompleteGuard', () => {
        it('sends a finished household home', async () => {
            getHouseholdOrNull.mockResolvedValue({ onboardingComplete: true });
            const result = await TestBed.inject(
                OnboardingCompleteGuard,
            ).canActivate();
            expect(url(result)).toBe('/');
        });

        it.each([null, { onboardingComplete: false }])(
            'lets %j onboard',
            async (household) => {
                getHouseholdOrNull.mockResolvedValue(household);
                await expect(
                    TestBed.inject(OnboardingCompleteGuard).canActivate(),
                ).resolves.toBe(true);
            },
        );
    });
});
