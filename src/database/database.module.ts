import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl =
          configService.get<string>('DATABASE_URL') ||
          'postgresql://neondb_owner:npg_LU0ysWZ4OKmM@ep-sparkling-tree-b40tt1nn-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
        const isProd = configService.get<string>('NODE_ENV') === 'production';
        const useSsl = databaseUrl.includes('sslmode=require') || isProd;

        return {
          type: 'postgres',
          url: databaseUrl,
          ssl: useSsl ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          synchronize: false,
          logging: configService.get<string>('NODE_ENV') === 'development',
        };
      },
    }),
  ],
})
export class DatabaseModule implements OnModuleInit {
  private readonly logger = new Logger('DatabaseModule');

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query(`
        DO $$ BEGIN
          ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
          ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'AGENT';
        EXCEPTION WHEN duplicate_object THEN null; END $$;

        ALTER TABLE packages ADD COLUMN IF NOT EXISTS return_date DATE;

        DO $$ BEGIN
          CREATE TYPE payment_gateway_events_status_enum AS ENUM ('PROCESSED', 'FAILED', 'DUPLICATE', 'IGNORED');
        EXCEPTION WHEN duplicate_object THEN null; END $$;

        ALTER TABLE payment_gateway_events ADD COLUMN IF NOT EXISTS status payment_gateway_events_status_enum DEFAULT 'PROCESSED';
        ALTER TABLE payment_gateway_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_gateway_events' AND column_name='received_at') THEN
            UPDATE payment_gateway_events SET created_at = received_at WHERE created_at IS NULL;
          END IF;
        END $$;
      `);
    } catch (err: any) {
      this.logger.warn(`Schema auto-patch notice: ${err?.message || err}`);
    }
  }
}

