import { describe, expect, it, vi } from 'vitest';
import { UnavailableError } from '../../../shared/kernel/index.js';
import type { RateProvider } from '../client/frankfurter.client.js';
import type { ExchangeRate } from '../model/exchange-rate.js';
import type { ExchangeRateRepository } from '../repository/exchange-rate.repository.js';
import type { HouseholdRepository } from '../../household/repository/household.repository.js';
import { ExchangeRateService } from './exchange-rate.service.js';

const TODAY = '2026-09-12';

/** In-memory mirror with the same contract as the drizzle repository. */
function makeRepo(initial: ExchangeRate[] = []) {
    const rows = new Map<string, ExchangeRate>();
    const key = (r: ExchangeRate) => `${r.base}|${r.quote}|${r.date}`;
    for (const r of initial) rows.set(key(r), r);
    const ofBase = (base: string) =>
        [...rows.values()].filter((r) => r.base === base);
    const repo = {
        rows,
        latestDay: vi.fn(async (base: string) => {
            const days = ofBase(base)
                .map((r) => r.date)
                .sort();
            return days.at(-1) ?? null;
        }),
        earliestDay: vi.fn(async (base: string) => {
            const days = ofBase(base)
                .map((r) => r.date)
                .sort();
            return days[0] ?? null;
        }),
        listRates: vi.fn(async (base: string, from: string, to: string) =>
            ofBase(base).filter((r) => r.date >= from && r.date <= to),
        ),
        latestOnOrBefore: vi.fn(async (base: string, day: string) => {
            const newest = new Map<string, ExchangeRate>();
            for (const r of ofBase(base)
                .filter((r) => r.date <= day)
                .sort((a, b) => b.date.localeCompare(a.date))) {
                if (!newest.has(r.quote)) newest.set(r.quote, r);
            }
            return [...newest.values()];
        }),
        storeMany: vi.fn(
            async (rates: ExchangeRate[], provisionalDay: string) => {
                for (const r of rates) {
                    if (r.date === provisionalDay || !rows.has(key(r))) {
                        rows.set(key(r), r);
                    }
                }
            },
        ),
    };
    return repo as typeof repo & ExchangeRateRepository;
}

function makeProvider(rates: ExchangeRate[] = [], fail = false) {
    return {
        fetchRates: vi.fn(async () => {
            if (fail) throw new Error('boom');
            return rates;
        }),
    } as RateProvider & { fetchRates: ReturnType<typeof vi.fn> };
}

const households = {
    listBaseCurrencies: vi.fn(async () => ['CHF']),
} as unknown as HouseholdRepository;

class TestService extends ExchangeRateService {
    constructor(repo: ExchangeRateRepository, provider: RateProvider) {
        super(repo, provider, households);
    }
    protected override now(): Date {
        return new Date(`${TODAY}T10:00:00.000Z`);
    }
}

const chfEur = (date: string, rate: number): ExchangeRate => ({
    base: 'CHF',
    quote: 'EUR',
    date,
    rate,
});

describe('ExchangeRateService.sync', () => {
    it('backfills from the needed day up to today when the mirror is empty', async () => {
        const repo = makeRepo();
        const provider = makeProvider([chfEur('2026-09-01', 1.06)]);
        await new TestService(repo, provider).sync('CHF', '2026-09-01');

        expect(provider.fetchRates).toHaveBeenCalledWith(
            'CHF',
            ['EUR', 'USD', 'GBP'],
            '2026-09-01',
            TODAY,
        );
        expect(repo.rows.size).toBe(1);
    });

    it('re-fetches from the newest mirrored day when the mirror is merely stale', async () => {
        const repo = makeRepo([chfEur('2026-09-10', 1.05)]);
        const provider = makeProvider([chfEur('2026-09-11', 1.06)]);
        await new TestService(repo, provider).sync('CHF', '2026-09-10');

        expect(provider.fetchRates).toHaveBeenCalledWith(
            'CHF',
            expect.any(Array),
            '2026-09-10',
            TODAY,
        );
    });

    it('keeps final days untouched and replaces only the previously newest (possibly provisional) day', async () => {
        const repo = makeRepo([
            chfEur('2026-09-09', 1.02),
            chfEur('2026-09-10', 1.05),
        ]);
        const provider = makeProvider([
            chfEur('2026-09-09', 9.99),
            chfEur('2026-09-10', 1.06),
            chfEur(TODAY, 1.07),
        ]);
        await new TestService(repo, provider).sync('CHF', '2026-09-09');

        expect(repo.storeMany).toHaveBeenCalledWith(
            expect.any(Array),
            '2026-09-10',
        );
        expect(repo.rows.get('CHF|EUR|2026-09-09')?.rate).toBe(1.02);
        expect(repo.rows.get('CHF|EUR|2026-09-10')?.rate).toBe(1.06);
        expect(repo.rows.get(`CHF|EUR|${TODAY}`)?.rate).toBe(1.07);
    });

    it('asks the provider at most once per day per base', async () => {
        const repo = makeRepo([chfEur('2026-09-10', 1.05)]);
        // Provider has nothing newer (weekend, holiday): the mirror stays stale.
        const provider = makeProvider([]);
        const service = new TestService(repo, provider);
        await service.sync('CHF', '2026-09-10');
        await service.sync('CHF', '2026-09-10');
        await service.sync('EUR', '2026-09-10');

        expect(provider.fetchRates).toHaveBeenCalledTimes(2);
    });

    it('skips the provider when today is already mirrored', async () => {
        const repo = makeRepo([chfEur(TODAY, 1.05)]);
        const provider = makeProvider();
        await new TestService(repo, provider).sync('CHF', TODAY);

        expect(provider.fetchRates).not.toHaveBeenCalled();
    });

    it('swallows provider failures', async () => {
        const repo = makeRepo();
        await expect(
            new TestService(repo, makeProvider([], true)).sync('CHF', TODAY),
        ).resolves.toBeUndefined();
    });
});

describe('ExchangeRateService.converter', () => {
    const rates = [
        chfEur('2026-09-01', 2),
        chfEur('2026-09-05', 4),
        {
            base: 'CHF',
            quote: 'USD',
            date: '2026-09-03',
            rate: 1.25,
        } as ExchangeRate,
    ];

    it('uses the latest rate on or before each day and rounds to minor units', async () => {
        const service = new TestService(makeRepo(rates), makeProvider());
        const convert = await service.converter(
            'CHF',
            new Date('2026-09-02'),
            new Date('2026-09-30'),
        );

        expect(convert.base).toBe('CHF');
        expect(convert.toBase(1000, 'CHF', new Date('2026-09-02'))).toBe(1000);
        // 2026-09-02: falls back to the 09-01 row (1 CHF = 2 EUR)
        expect(convert.toBase(1000, 'EUR', new Date('2026-09-02'))).toBe(500);
        // 2026-09-05 onwards: 1 CHF = 4 EUR
        expect(convert.toBase(1001, 'EUR', new Date('2026-09-20'))).toBe(250);
        expect(convert.toBase(1000, 'USD', new Date('2026-09-10'))).toBe(800);
    });

    it('fails per amount when no rate exists on or before the day', async () => {
        const service = new TestService(makeRepo(rates), makeProvider());
        const convert = await service.converter(
            'CHF',
            new Date('2026-09-01'),
            new Date('2026-09-30'),
        );
        expect(() => convert.toBase(1, 'USD', new Date('2026-09-01'))).toThrow(
            UnavailableError,
        );
    });

    it('still converts base amounts when the mirror is empty and the provider is down', async () => {
        const service = new TestService(makeRepo(), makeProvider([], true));
        const convert = await service.converter(
            'CHF',
            new Date('2026-09-01'),
            new Date('2026-09-30'),
        );
        expect(convert.toBase(500, 'CHF', new Date('2026-09-10'))).toBe(500);
        expect(() =>
            convert.toBase(500, 'EUR', new Date('2026-09-10')),
        ).toThrow(UnavailableError);
    });
});
