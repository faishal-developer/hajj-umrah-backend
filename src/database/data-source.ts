import { DataSource } from 'typeorm';
import 'dotenv/config';
import { InitialBaseline1710000000000 } from './migrations/1710000000000-InitialBaseline.js';

import { User } from '../users/entities/user.entity.js';
import { Package } from '../packages/entities/package.entity.js';
import { PackageTier } from '../packages/entities/package-tier.entity.js';
import { Booking } from '../bookings/entities/booking.entity.js';
import { BookingPilgrim } from '../bookings/entities/booking-pilgrim.entity.js';
import { SeatReservation } from '../bookings/entities/seat-reservation.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { Installment } from '../payments/entities/installment.entity.js';
import { PaymentAllocation } from '../payments/entities/payment-allocation.entity.js';
import { PaymentGatewayEvent } from '../payments/entities/payment-gateway-event.entity.js';
import { Cancellation } from '../cancellations/entities/cancellation.entity.js';
import { CancellationPilgrim } from '../cancellations/entities/cancellation-pilgrim.entity.js';
import { Refund } from '../cancellations/entities/refund.entity.js';
import { IdempotencyRecord } from '../common/entities/idempotency-record.entity.js';
import { AuditLog } from '../common/entities/audit-log.entity.js';
import { ReconciliationRecord } from '../reconciliation/entities/reconciliation-record.entity.js';

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_LU0ysWZ4OKmM@ep-sparkling-tree-b40tt1nn-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: databaseUrl.includes('sslmode=require') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  entities: [
    User,
    Package,
    PackageTier,
    Booking,
    BookingPilgrim,
    SeatReservation,
    Payment,
    Installment,
    PaymentAllocation,
    PaymentGatewayEvent,
    Cancellation,
    CancellationPilgrim,
    Refund,
    IdempotencyRecord,
    AuditLog,
    ReconciliationRecord,
    'dist/**/*.entity.js',
  ],
  migrations: [InitialBaseline1710000000000],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

export default AppDataSource;
