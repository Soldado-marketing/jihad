import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * S-05: Resolve allowed CORS origins from the environment.
 * Supports a comma-separated list via CORS_ORIGINS, falls back to WEB_URL,
 * and finally to the local development origin. No wildcard is used.
 */
function resolveCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? process.env.WEB_URL ?? 'http://localhost:3000';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // S-04: HTTP security headers.
  // CSP is disabled because this service returns JSON only (CSP belongs to the
  // web app). Cross-Origin-Resource-Policy is relaxed to 'cross-origin' so the
  // separate-origin web app (e.g. localhost:3000) can read API responses.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // S-05: Environment-based CORS allow-list (no wildcard with credentials).
  const allowedOrigins = resolveCorsOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (server-to-server, curl, health checks).
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
