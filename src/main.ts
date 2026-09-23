import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import type { Request, Response } from 'express';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

const server = express();
let appInstance: INestApplication;

async function createNestApp(expressInstance?: express.Express): Promise<INestApplication> {
  const app = expressInstance
    ? await NestFactory.create(AppModule, new ExpressAdapter(expressInstance))
    : await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');

  // Enable CORS
  app.enableCors();

  // Set Global Prefix
  app.setGlobalPrefix(apiPrefix);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Error Filter & Response Interceptor
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Hajj & Umrah Package Booking System API')
    .setDescription(
      'REST API documentation for Hajj & Umrah package booking, seat reservations, installments, payments, cancellations, and administration.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  return app;
}

// Local Standalone Execution
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await createNestApp();

  const configService = app.get(ConfigService);
  const defaultPort = Number(process.env.PORT) || 3000;
  const port = configService.get<number>('PORT', defaultPort);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');

  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger documentation available on http://localhost:${port}/api/docs`);
  logger.log(`Health check available on http://localhost:${port}/${apiPrefix}/health`);
}

if (!process.env.VERCEL) {
  void bootstrap();
}

// Vercel Serverless Function Handler
export default async function handler(req: Request, res: Response) {
  if (!appInstance) {
    appInstance = await createNestApp(server);
    await appInstance.init();
  }
  server(req, res);
}

