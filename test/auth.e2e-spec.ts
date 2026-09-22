import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { User } from '../src/users/entities/user.entity.js';
import { UserRole } from '../src/users/enums/user-role.enum.js';
import { UserStatus } from '../src/users/enums/user-status.enum.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';

describe('Authentication & Authorization (e2e)', () => {
  let app: INestApplication;
  const usersStore = new Map<string, User>();
  const testEmail = 'pilgrim@example.com';
  const testPassword = 'SecurePassword123!';
  let jwtToken = '';

  const mockUserRepository = {
    create: (dto: Partial<User>) => {
      const user: User = {
        id: '11111111-2222-3333-4444-555555555555',
        name: dto.name || '',
        email: dto.email || '',
        phone: dto.phone || null,
        passwordHash: dto.passwordHash || '',
        role: dto.role || UserRole.USER,
        status: dto.status || UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return user;
    },
    save: async (user: User) => {
      usersStore.set(user.id, user);
      return user;
    },
    findOne: async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) {
        return usersStore.get(where.id) || null;
      }
      if (where.email) {
        for (const user of usersStore.values()) {
          if (user.email === where.email) {
            return user;
          }
        }
      }
      return null;
    },
    count: async ({ where }: { where: { email?: string } }) => {
      if (where.email) {
        for (const user of usersStore.values()) {
          if (user.email === where.email) {
            return 1;
          }
        }
      }
      return 0;
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockUserRepository)
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
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with USER role and return access_token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Hajj Pilgrim',
          email: testEmail,
          password: testPassword,
          phone: '+8801711112222',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testEmail.toLowerCase());
      expect(response.body.data.user.role).toBe('USER');
      expect(response.body.data.user.passwordHash).toBeUndefined();

      jwtToken = response.body.data.access_token;
    });

    it('should reject registration if email is already taken', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate Pilgrim',
          email: testEmail,
          password: testPassword,
        })
        .expect(409);
    });

    it('should reject registration with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Invalid Email',
          email: 'not-an-email',
          password: testPassword,
        })
        .expect(400);
    });

    it('should reject registration with password shorter than 6 characters', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Short Password',
          email: 'short@example.com',
          password: '123',
        })
        .expect(400);
    });

    it('should reject extraneous fields like role=ADMIN due to forbidNonWhitelisted', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Hacker',
          email: 'hacker@example.com',
          password: testPassword,
          role: 'ADMIN',
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with correct credentials and return access_token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.user.email).toBe(testEmail.toLowerCase());
      expect(response.body.data.user.role).toBe('USER');
    });

    it('should reject login with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject login with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return the current user profile when valid Bearer token is provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe(testEmail.toLowerCase());
      expect(response.body.data.role).toBe('USER');
      expect(response.body.data.name).toBe('Hajj Pilgrim');
      expect(response.body.data.passwordHash).toBeUndefined();
    });

    it('should reject request when no authorization header is present', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should reject request with malformed or invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });
  });
});
