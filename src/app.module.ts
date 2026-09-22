import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';

import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { CancellationsModule } from './cancellations/cancellations.module.js';
import { PackagesModule } from './packages/packages.module.js';
import { SeatReservationModule } from './seat-reservation/seat-reservation.module.js';
import { InstallmentsModule } from './installments/installments.module.js';
import { ReconciliationModule } from './reconciliation/reconciliation.module.js';
import { VendorsModule } from './vendors/vendors.module.js';
import { InventoryModule } from './inventory/inventory.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    PackagesModule,
    SeatReservationModule,
    BookingsModule,
    InstallmentsModule,
    PaymentsModule,
    CancellationsModule,
    ReconciliationModule,
    VendorsModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
