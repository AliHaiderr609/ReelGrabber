import * as Sentry from '@sentry/node';

export interface SentryInitOptions {
  dsn?: string;
  serviceName: string;
  environment?: string;
  release?: string;
}

export function initSentry(options: SentryInitOptions): void {
  const dsn = options.dsn?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: options.environment ?? process.env.NODE_ENV ?? 'development',
    release: options.release,
    serverName: options.serviceName,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  });
}

export { Sentry };
