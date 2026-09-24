import { of } from 'rxjs';
import {
    DelayedPreloadingStrategy,
    PRELOAD_DELAY_MS,
} from './delayed-preloading.strategy';

describe('DelayedPreloadingStrategy', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('loads the route only after the delay', () => {
        const load = vi.fn(() => of('chunk'));
        const received: unknown[] = [];

        new DelayedPreloadingStrategy()
            .preload({}, load)
            .subscribe((value) => received.push(value));

        vi.advanceTimersByTime(PRELOAD_DELAY_MS - 1);
        expect(load).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(load).toHaveBeenCalledTimes(1);
        expect(received).toEqual(['chunk']);
    });
});
