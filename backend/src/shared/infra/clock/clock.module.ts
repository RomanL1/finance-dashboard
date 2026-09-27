import { Global, Module } from '@nestjs/common';
import { CLOCK, systemClock } from '../../kernel/index.js';

/** One clock for every feature; e2e specs override `CLOCK` to move time. */
@Global()
@Module({
    providers: [{ provide: CLOCK, useValue: systemClock }],
    exports: [CLOCK],
})
export class ClockModule {}
