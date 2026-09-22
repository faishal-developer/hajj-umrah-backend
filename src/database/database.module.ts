import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

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
export class DatabaseModule {}
