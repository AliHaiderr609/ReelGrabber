import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { parseGatewayEnv } from '@reelgrabber/config';
import { createLogger } from '@reelgrabber/logger';
import { initObservability, shutdownTracing } from '@reelgrabber/monitoring';
import { AppModule } from './app.module';

loadEnv({ path: resolve(__dirname, '../.env') });

async function bootstrap() {
  const env = parseGatewayEnv();
  const logger = createLogger('api-gateway');

  await initObservability({
    serviceName: env.SERVICE_NAME,
    environment: env.NODE_ENV,
    metricsEnabled: env.METRICS_ENABLED,
    sentryDsn: env.SENTRY_DSN,
    otelEnabled: env.OTEL_ENABLED,
    otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
  });

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.use(helmet());
  app.enableCors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  });

  await app.listen(env.PORT);
  logger.info(
    {
      port: env.PORT,
      corsOrigin: env.CORS_ORIGIN,
      metricsEnabled: env.METRICS_ENABLED,
      otelEnabled: env.OTEL_ENABLED,
    },
    'API gateway listening'
  );

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down API gateway');
    await app.close();
    await shutdownTracing();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('Failed to start API gateway:', error);
  process.exit(1);
});
