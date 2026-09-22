import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { User } from '../src/users/entities/user.entity.js';
import { UserRole } from '../src/users/enums/user-role.enum.js';
import { UserStatus } from '../src/users/enums/user-status.enum.js';
import { Booking } from '../src/bookings/entities/booking.entity.js';
import { BookingStatus } from '../src/bookings/enums/booking-status.enum.js';
import { PaymentMode } from '../src/bookings/enums/payment-mode.enum.js';
import { Payment } from '../src/payments/entities/payment.entity.js';
import { PaymentStatus } from '../src/payments/enums/payment-status.enum.js';
import { Cancellation } from '../src/cancellations/entities/cancellation.entity.js';
import { Refund } from '../src/cancellations/entities/refund.entity.js';
import { RefundStatus } from '../src/cancellations/enums/refund-status.enum.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import bcrypt from 'bcryptjs';

describe('B03 — User and Permission Foundation: Ownership Rules (e2e)', () => {
  let app: INestApplication;

  const usersStore = new Map<string, User>();
  const bookingsStore = new Map<string, Booking>();
  const paymentsStore = new Map<string, Payment>();
  const cancellationsStore = new Map<string, Cancellation>();
  const refundsStore = new Map<string, Refund>();

  const userAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const userBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const adminId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  const bookingAId = '11111111-1111-1111-1111-111111111111';
  const paymentAId = '22222222-2222-2222-2222-222222222222';
  const cancellationAId = '33333333-3333-3333-3333-333333333333';
  const refundAId = '44444444-4444-4444-4444-444444444444';

  let tokenUserA = '';
  let tokenUserB = '';
  let tokenAdmin = '';

  const mockUserRepository = {
    create: (dto: Partial<User>) => dto as User,
    save: async (user: User) => {
      usersStore.set(user.id, user);
      return user;
    },
    findOne: async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) return usersStore.get(where.id) || null;
      if (where.email) {
        for (const u of usersStore.values()) {
          if (u.email === where.email) return u;
        }
      }
      return null;
    },
    count: async ({ where }: { where: { email?: string } }) => {
      if (where.email) {
        for (const u of usersStore.values()) {
          if (u.email === where.email) return 1;
        }
      }
      return 0;
    },
  };

  const mockBookingRepository = {
    find: async ({ where }: { where?: { userId?: string } }) => {
      const all = Array.from(bookingsStore.values());
      if (where?.userId) {
        return all.filter((b) => b.userId === where.userId);
      }
      return all;
    },
    findOne: async ({ where }: { where: { id?: string } }) => {
      if (where.id) return bookingsStore.get(where.id) || null;
      return null;
    },
    save: async (booking: Booking) => {
      bookingsStore.set(booking.id, booking);
      return booking;
    },
  };

  const mockPaymentRepository = {
    find: async ({ where }: { where?: { bookingId?: string } }) => {
      const all = Array.from(paymentsStore.values());
      if (where?.bookingId) {
        return all.filter((p) => p.bookingId === where.bookingId);
      }
      return all;
    },
    findOne: async ({ where }: { where: { id?: string } }) => {
      if (where.id) return paymentsStore.get(where.id) || null;
      return null;
    },
    createQueryBuilder: () => ({
      innerJoinAndSelect: function () {
        return this;
      },
      leftJoinAndSelect: function () {
        return this;
      },
      where: function (_clause: string, params: { userId: string }) {
        this.userIdParam = params.userId;
        return this;
      },
      orderBy: function () {
        return this;
      },
      getMany: async function () {
        return Array.from(paymentsStore.values()).filter(
          (p) => p.booking?.userId === this.userIdParam,
        );
      },
    }),
  };

  const mockCancellationRepository = {
    find: async ({ where }: { where?: { bookingId?: string } }) => {
      const all = Array.from(cancellationsStore.values());
      if (where?.bookingId) {
        return all.filter((c) => c.bookingId === where.bookingId);
      }
      return all;
    },
    findOne: async ({ where }: { where: { id?: string } }) => {
      if (where.id) return cancellationsStore.get(where.id) || null;
      return null;
    },
    createQueryBuilder: () => ({
      innerJoinAndSelect: function () {
        return this;
      },
      leftJoinAndSelect: function () {
        return this;
      },
      where: function (_clause: string, params: { userId: string }) {
        this.userIdParam = params.userId;
        return this;
      },
      orderBy: function () {
        return this;
      },
      getMany: async function () {
        return Array.from(cancellationsStore.values()).filter(
          (c) => c.booking?.userId === this.userIdParam,
        );
      },
    }),
  };

  const mockRefundRepository = {
    find: async ({ where }: { where?: { bookingId?: string } }) => {
      const all = Array.from(refundsStore.values());
      if (where?.bookingId) {
        return all.filter((r) => r.bookingId === where.bookingId);
      }
      return all;
    },
    findOne: async ({ where }: { where: { id?: string } }) => {
      if (where.id) return refundsStore.get(where.id) || null;
      return null;
    },
    createQueryBuilder: () => ({
      innerJoinAndSelect: function () {
        return this;
      },
      where: function (_clause: string, params: { userId: string }) {
        this.userIdParam = params.userId;
        return this;
      },
      orderBy: function () {
        return this;
      },
      getMany: async function () {
        return Array.from(refundsStore.values()).filter(
          (r) => r.booking?.userId === this.userIdParam,
        );
      },
    }),
  };

  beforeAll(async () => {
    // Seed test users in usersStore
    const passwordHash = await bcrypt.hash('Password123!', 10);

    const userA: User = {
      id: userAId,
      name: 'Pilgrim User A',
      email: 'usera@example.com',
      phone: null,
      passwordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersStore.set(userA.id, userA);

    const userB: User = {
      id: userBId,
      name: 'Pilgrim User B',
      email: 'userb@example.com',
      phone: null,
      passwordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersStore.set(userB.id, userB);

    const admin: User = {
      id: adminId,
      name: 'Admin User',
      email: 'admin@example.com',
      phone: null,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersStore.set(admin.id, admin);

    // Seed resources owned by User A
    const bookingA: Booking = {
      id: bookingAId,
      userId: userAId,
      packageId: '99999999-9999-9999-9999-999999999999',
      tierId: '88888888-8888-8888-8888-888888888888',
      status: BookingStatus.HELD,
      paymentMode: PaymentMode.FULL,
      tierNameSnapshot: 'Standard',
      unitPriceSnapshot: 200000,
      totalAmount: 200000,
      expiresAt: null,
      version: 1,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: userA,
      pilgrims: [],
      seatReservations: [],
    };
    bookingsStore.set(bookingA.id, bookingA);

    const paymentA: Payment = {
      id: paymentAId,
      bookingId: bookingAId,
      provider: 'BKASH',
      method: 'BKASH',
      amount: 200000,
      currency: 'BDT',
      gatewayTransactionId: 'BKASH_TRX_123',
      status: PaymentStatus.SUCCESS,
      createdBy: null,
      approvedBy: null,
      createdAt: new Date(),
      booking: bookingA,
      allocations: [],
    };
    paymentsStore.set(paymentA.id, paymentA);

    const cancellationA: Cancellation = {
      id: cancellationAId,
      bookingId: bookingAId,
      reason: 'Personal reason',
      cancellationFee: 10000,
      status: 'REQUESTED',
      createdAt: new Date(),
      booking: bookingA,
      pilgrims: [],
    };
    cancellationsStore.set(cancellationA.id, cancellationA);

    const refundA: Refund = {
      id: refundAId,
      bookingId: bookingAId,
      amount: 190000,
      status: RefundStatus.REQUESTED,
      approvedBy: null,
      createdAt: new Date(),
      booking: bookingA,
    };
    refundsStore.set(refundA.id, refundA);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockUserRepository)
      .overrideProvider(getRepositoryToken(Booking))
      .useValue(mockBookingRepository)
      .overrideProvider(getRepositoryToken(Payment))
      .useValue(mockPaymentRepository)
      .overrideProvider(getRepositoryToken(Cancellation))
      .useValue(mockCancellationRepository)
      .overrideProvider(getRepositoryToken(Refund))
      .useValue(mockRefundRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();

    // Authenticate users
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'usera@example.com', password: 'Password123!' });
    tokenUserA = resA.body.data.access_token;

    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'userb@example.com', password: 'Password123!' });
    tokenUserB = resB.body.data.access_token;

    const resAdmin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Password123!' });
    tokenAdmin = resAdmin.body.data.access_token;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Bookings Ownership Rules', () => {
    it('User A should view own bookings via GET /bookings/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings/me')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(bookingAId);
      expect(res.body.data[0].userId).toBe(userAId);
    });

    it('User B should get empty list from /bookings/me (cannot see User A data)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings/me')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(0);
    });

    it('Query param GET /bookings?userId=userAId should NOT return User A data to User B', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/bookings?userId=${userAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      // Identity is strictly derived from JWT, so User B only receives their own (empty) list
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(0);
    });

    it('User A can view own booking details via GET /bookings/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${bookingAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.data.id).toBe(bookingAId);
      expect(res.body.data.userId).toBe(userAId);
    });

    it('User B CANNOT view User A booking details via GET /bookings/:id (returns 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/bookings/${bookingAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(403);
    });

    it('Admin CAN view User A booking details via GET /bookings/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/bookings/${bookingAId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.data.id).toBe(bookingAId);
    });

    it('User B CANNOT cancel User A booking via POST /bookings/:id/cancel (returns 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingAId}/cancel`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ reason: 'Hacking attempt' })
        .expect(403);
    });

    it('User A CAN cancel own booking via POST /bookings/:id/cancel', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${bookingAId}/cancel`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ reason: 'Schedule conflict' })
        .expect(201);

      expect(res.body.data.status).toBe(BookingStatus.CANCELLED);
    });
  });

  describe('2. Payments Ownership Rules', () => {
    it('User A can view own payments via GET /payments/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/payments/me')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(paymentAId);
    });

    it('User B cannot view User A payments via GET /payments/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/payments/me')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(0);
    });

    it('User A can view payment details via GET /payments/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.data.id).toBe(paymentAId);
    });

    it('User B CANNOT view User A payment via GET /payments/:id (returns 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(403);
    });

    it('Admin CAN view User A payment via GET /payments/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentAId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.data.id).toBe(paymentAId);
    });

    it('User B CANNOT view payments by booking ID for User A (returns 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/payments/booking/${bookingAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(403);
    });

    it('User A CAN view payments by booking ID for own booking', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/payments/booking/${bookingAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(paymentAId);
    });
  });

  describe('3. Cancellations & Refunds Ownership Rules', () => {
    it('User A can view own cancellations via GET /cancellations/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/cancellations/me')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(cancellationAId);
    });

    it('User B cannot view User A cancellations via GET /cancellations/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/cancellations/me')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(0);
    });

    it('User B CANNOT view User A cancellation details via GET /cancellations/:id (returns 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/cancellations/${cancellationAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(403);
    });

    it('User A can view own cancellation details via GET /cancellations/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/cancellations/${cancellationAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.data.id).toBe(cancellationAId);
    });

    it('Admin CAN view User A cancellation details via GET /cancellations/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/cancellations/${cancellationAId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.data.id).toBe(cancellationAId);
    });

    it('User A can view own refunds via GET /refunds/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/refunds/me')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(refundAId);
    });

    it('User B CANNOT view User A refund via GET /refunds/:id (returns 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/refunds/${refundAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(403);
    });

    it('User A can view own refund via GET /refunds/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/refunds/${refundAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.data.id).toBe(refundAId);
    });

    it('Admin CAN view User A refund via GET /refunds/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/refunds/${refundAId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body.data.id).toBe(refundAId);
    });
  });
});
