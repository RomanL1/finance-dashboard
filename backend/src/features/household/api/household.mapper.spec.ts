import { describe, expect, it } from 'vitest';
import { HouseholdDto } from '../model/household.dto.js';
import { toHouseholdDto } from './household.mapper.js';

describe('toHouseholdDto', () => {
    it('flattens the household and keeps the caller role', () => {
        const dto = toHouseholdDto({
            role: 'member',
            household: {
                id: 'h-1',
                name: 'Home',
                onboardingComplete: true,
                baseCurrency: 'EUR',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
            },
        });

        expect(dto).toBeInstanceOf(HouseholdDto);
        expect({ ...dto }).toEqual({
            id: 'h-1',
            name: 'Home',
            role: 'member',
            onboardingComplete: true,
            baseCurrency: 'EUR',
            createdAt: '2026-01-01T00:00:00.000Z',
        });
    });
});
