import pino, { type Logger, type LoggerOptions } from 'pino';

export interface RequestLogContext {
  requestId?: string;
  platform?: string;
  durationMs?: number;
  retries?: number;
  cacheHit?: boolean;
  workerVersion?: string;
  latencyMs?: number;
}

export function createLogger(name: string, options?: LoggerOptions): Logger {
  const isDev = process.env.NODE_ENV !== 'production';
  return pino({
    name,
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    ...(isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' },
          },
        }
      : {}),
    ...options,
  });
}

export function createRequestLogger(
  baseLogger: Logger,
  context: RequestLogContext
): Logger {
  return baseLogger.child(context);
}
