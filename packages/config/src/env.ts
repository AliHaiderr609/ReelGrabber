import { z } from 'zod';

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
});

/** Environment consumed by apps/web (existing Next.js app). */
export const webEnvSchema = baseEnvSchema.extend({
  JWT_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  IG_SESSIONID: z.string().optional(),
  IG_DS_USER_ID: z.string().optional(),
  IG_CSRFTOKEN: z.string().optional(),
  /** When true, /api/download tries the API gateway before legacy Puppeteer extraction. */
  USE_API_GATEWAY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  API_GATEWAY_URL: z.string().url().default('http://localhost:4000'),
  GATEWAY_POLL_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  GATEWAY_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(500),
});

/** Environment consumed by the NestJS API gateway (Phase 3). */
export const gatewayEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  QUEUE_PREFIX: z.string().default('reelgrabber'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  ENABLE_JOB_PROCESSOR: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  INSTAGRAM_WORKER_URL: z.string().url().default('http://localhost:8001'),
  SERVICE_NAME: z.string().default('api-gateway'),
  METRICS_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  SENTRY_DSN: z.string().optional(),
  OTEL_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z
    .string()
    .url()
    .default('http://localhost:4318/v1/traces'),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;

export function parseWebEnv(env: NodeJS.ProcessEnv = process.env): WebEnv {
  return webEnvSchema.parse(env);
}

export function parseGatewayEnv(env: NodeJS.ProcessEnv = process.env): GatewayEnv {
  return gatewayEnvSchema.parse(env);
}
