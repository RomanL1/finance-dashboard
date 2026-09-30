import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { householdList, householdUpdateHousehold } from '../../../core/api';
import { APP_PATHS } from '../../../config/paths.config';
import type { HouseholdDto, UpdateHouseholdDto } from '../household.types';

const STORAGE_KEY = 'activeHouseholdId';
/** Survives the restart of `switchTo`, so the app can confirm the switch once it is back. */
const SWITCHED_KEY = 'householdSwitched';

/**
 * A user can be in several households; the app works in one of them, the active household.
 * Which one is remembered per browser. Switching reloads the app, so no page keeps data
 * of the household left behind.
 */
@Injectable({ providedIn: 'root' })
export class HouseholdService {
    /** Same list on every tab; fetched once per session. Rejections are not cached. */
    private cached: Promise<HouseholdDto[]> | null = null;

    constructor(@Inject(DOCUMENT) private readonly document: Document) {}

    /** Every household of the user, oldest membership first. */
    getHouseholds(): Promise<HouseholdDto[]> {
        this.cached ??= householdList({ throwOnError: true }).then(
            (response) => response.data,
            (error: unknown) => {
                this.cached = null;
                throw error;
            },
        );
        return this.cached;
    }

    /** The active household. Rejects when the user has none. */
    async getHousehold(): Promise<HouseholdDto> {
        const household = active(await this.getHouseholds());
        if (!household) throw new Error('No household');
        return household;
    }

    /**
     * Resolves `null` instead of throwing when the user has no household yet.
     * Always fetches; the result seeds the session cache so the first page
     * after the onboarding guard does not fetch it again.
     */
    async getHouseholdOrNull(): Promise<HouseholdDto | null> {
        const response = await householdList();
        const households = response.data;
        if (!households) return null;
        this.cached = Promise.resolve(households);
        return active(households);
    }

    /** Owners only. The session cache takes the response so every tab sees the change. */
    async update(
        householdId: string,
        changes: UpdateHouseholdDto,
    ): Promise<HouseholdDto> {
        const response = await householdUpdateHousehold({
            path: { householdId },
            body: changes,
            throwOnError: true,
        });
        const households = (await this.cached) ?? [];
        this.cached = Promise.resolve(
            households.map((household) =>
                household.id === householdId ? response.data : household,
            ),
        );
        return response.data;
    }

    /** Makes `householdId` the active household and restarts the app on the home page. */
    switchTo(householdId: string): void {
        try {
            localStorage.setItem(STORAGE_KEY, householdId);
        } catch {
            /* private mode: the app falls back to the oldest membership */
        }
        try {
            sessionStorage.setItem(SWITCHED_KEY, '1');
        } catch {
            /* private mode: the switch just goes unconfirmed */
        }
        this.restart();
    }

    /** True once after a `switchTo`: the caller confirms the switch to the user. */
    takeSwitchNotice(): boolean {
        try {
            const switched = sessionStorage.getItem(SWITCHED_KEY) !== null;
            sessionStorage.removeItem(SWITCHED_KEY);
            return switched;
        } catch {
            return false;
        }
    }

    /**
     * Call after the server answered 403 for `householdId`. If the user was removed from it,
     * the app restarts: the guards then pick another household or lead to onboarding.
     */
    async leaveIfRemoved(householdId: string): Promise<void> {
        const response = await householdList();
        if (!response.data) return;
        if (response.data.some((household) => household.id === householdId)) {
            return;
        }
        this.restart();
    }

    private restart(): void {
        this.document.location.assign('/' + APP_PATHS.HOME);
    }
}

/** The remembered household if the user is still in it, else the oldest membership. */
function active(households: HouseholdDto[]): HouseholdDto | null {
    let stored: string | null = null;
    try {
        stored = localStorage.getItem(STORAGE_KEY);
    } catch {
        /* private mode: nothing remembered */
    }
    return (
        households.find((household) => household.id === stored) ??
        households[0] ??
        null
    );
}
