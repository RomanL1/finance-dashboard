import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { env } from '../../../shared/infra/config/env.js';
import { RecurringService } from './recurring.service.js';

/**
 * Books recurring transactions every minute, so a new month's occurrences land within a
 * minute of local midnight on the 1st, and once on boot to catch up on downtime.
 *
 * Assumes a single API instance. A second one would tick too; the compare-and-set in
 * `RecurringRepository.book` still keeps every occurrence to one transaction.
 */
@Injectable()
export class RecurringScheduler implements OnApplicationBootstrap {
    private readonly logger = new Logger(RecurringScheduler.name);
    private running = false;

    constructor(private readonly recurring: RecurringService) {}

    onApplicationBootstrap(): void {
        void this.tick();
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async tick(): Promise<void> {
        // A slow run (big backfill) must not stack up behind the next tick.
        if (!env.recurringScheduler || this.running) return;
        this.running = true;
        try {
            const booked = await this.recurring.runDue();
            if (booked > 0) {
                this.logger.log(`Booked ${booked} recurring transaction(s)`);
            }
        } catch (error) {
            this.logger.error(
                'Recurring booking run failed',
                error instanceof Error ? error.stack : String(error),
            );
        } finally {
            this.running = false;
        }
    }
}
