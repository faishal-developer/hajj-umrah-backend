import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { BookingsService } from '../bookings.service.js';

@Injectable()
export class BookingExpirationScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(BookingExpirationScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs = 60 * 1000; // 60 seconds

  constructor(private readonly bookingsService: BookingsService) {}

  onApplicationBootstrap() {
    this.logger.log('Starting Booking Expiration Scheduler (every 60s)...');
    this.timer = setInterval(async () => {
      try {
        const expiredCount =
          await this.bookingsService.expireAllOverdueBookings();
        if (expiredCount > 0) {
          this.logger.log(
            `Expired ${expiredCount} overdue booking(s) and returned held seats to tier quota.`,
          );
        }
      } catch (err) {
        this.logger.error(
          `Error running booking expiration sweep: ${(err as Error).message}`,
        );
      }
    }, this.intervalMs);
  }

  onApplicationShutdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('Stopped Booking Expiration Scheduler.');
    }
  }
}
