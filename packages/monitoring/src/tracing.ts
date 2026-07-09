import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | null = null;

export interface TracingInitOptions {
  enabled: boolean;
  serviceName: string;
  otlpEndpoint?: string;
}

export async function initTracing(options: TracingInitOptions): Promise<void> {
  if (!options.enabled || sdk) return;

  const exporter = new OTLPTraceExporter({
    url: options.otlpEndpoint ?? 'http://localhost:4318/v1/traces',
  });

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: options.serviceName,
    }),
    traceExporter: exporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  await sdk.start();
}

export async function shutdownTracing(): Promise<void> {
  await sdk?.shutdown();
  sdk = null;
}
