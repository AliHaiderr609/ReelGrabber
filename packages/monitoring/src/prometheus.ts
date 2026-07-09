import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

let registry: Registry | null = null;
let httpRequestDuration: Histogram<'method' | 'route' | 'status_code'> | null = null;
let extractJobsTotal: Counter<'platform' | 'status'> | null = null;
let extractJobDuration: Histogram<'platform'> | null = null;

export function initPrometheusMetrics(serviceName: string): Registry {
  if (registry) return registry;

  registry = new Registry();
  registry.setDefaultLabels({ service: serviceName });

  collectDefaultMetrics({ register: registry });

  httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  });

  extractJobsTotal = new Counter({
    name: 'extract_jobs_total',
    help: 'Extract jobs processed by platform and terminal status',
    labelNames: ['platform', 'status'],
    registers: [registry],
  });

  extractJobDuration = new Histogram({
    name: 'extract_job_duration_seconds',
    help: 'Extract job processing duration in seconds',
    labelNames: ['platform'],
    registers: [registry],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  });

  return registry;
}

export function getMetricsRegistry(): Registry | null {
  return registry;
}

export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number
): void {
  httpRequestDuration?.observe(
    { method, route, status_code: String(statusCode) },
    durationSeconds
  );
}

export function recordExtractJob(
  platform: string,
  status: 'queued' | 'processing' | 'completed' | 'failed',
  durationSeconds?: number
): void {
  extractJobsTotal?.inc({ platform, status });
  if (durationSeconds !== undefined && status === 'completed') {
    extractJobDuration?.observe({ platform }, durationSeconds);
  }
}

export async function getMetricsText(): Promise<string> {
  if (!registry) return '';
  return registry.metrics();
}

/** Reset registry state — for unit tests only. */
export function resetPrometheusMetricsForTests(): void {
  registry = null;
  httpRequestDuration = null;
  extractJobsTotal = null;
  extractJobDuration = null;
}
