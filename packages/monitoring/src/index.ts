import { initPrometheusMetrics } from './prometheus';
import { initSentry } from './sentry';
import { initTracing } from './tracing';
export {
  getMetricsRegistry,
  getMetricsText,
  initPrometheusMetrics,
  recordExtractJob,
  recordHttpRequest,
  resetPrometheusMetricsForTests,
} from './prometheus';
export { initSentry, Sentry } from './sentry';
export { initTracing, shutdownTracing } from './tracing';

export interface ObservabilityOptions {
  serviceName: string;
  environment?: string;
  metricsEnabled?: boolean;
  sentryDsn?: string;
  otelEnabled?: boolean;
  otlpEndpoint?: string;
}

export async function initObservability(
  options: ObservabilityOptions
): Promise<void> {
  if (options.metricsEnabled !== false) {
    initPrometheusMetrics(options.serviceName);
  }

  initSentry({
    dsn: options.sentryDsn,
    serviceName: options.serviceName,
    environment: options.environment,
  });

  await initTracing({
    enabled: options.otelEnabled ?? false,
    serviceName: options.serviceName,
    otlpEndpoint: options.otlpEndpoint,
  });
}
