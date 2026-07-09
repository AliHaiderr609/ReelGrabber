import { parseWebEnv } from '@reelgrabber/config';
import { sleep } from '@reelgrabber/shared';
import type { ExtractionResult, MediaItem } from '@reelgrabber/types';
import { v4 as uuidv4 } from 'uuid';

type GatewayJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

interface GatewayJobRecord {
  jobId: string;
  status: GatewayJobStatus;
  error?: string;
  result?: ExtractionResult;
}

export interface GatewayExtractResult {
  results: MediaItem[];
  jobId: string;
}

export function isGatewayExtractEnabled(): boolean {
  return parseWebEnv().USE_API_GATEWAY;
}

export async function extractViaGateway(url: string): Promise<GatewayExtractResult> {
  const env = parseWebEnv();
  const requestId = uuidv4();
  const gatewayUrl = env.API_GATEWAY_URL.replace(/\/$/, '');

  const createResponse = await fetch(`${gatewayUrl}/v1/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': requestId,
    },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!createResponse.ok) {
    const body = await createResponse.text();
    throw new Error(
      `Gateway enqueue failed (${createResponse.status}): ${body.slice(0, 200)}`
    );
  }

  const { jobId } = (await createResponse.json()) as { jobId: string };
  const deadline = Date.now() + env.GATEWAY_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const statusResponse = await fetch(`${gatewayUrl}/v1/jobs/${jobId}`, {
      headers: { 'X-Request-Id': requestId },
      signal: AbortSignal.timeout(10_000),
    });

    if (!statusResponse.ok) {
      throw new Error(`Gateway job poll failed (${statusResponse.status})`);
    }

    const job = (await statusResponse.json()) as GatewayJobRecord;

    if (job.status === 'completed') {
      return {
        results: job.result?.items ?? [],
        jobId,
      };
    }

    if (job.status === 'failed') {
      throw new Error(job.error ?? 'Gateway extraction failed');
    }

    await sleep(env.GATEWAY_POLL_INTERVAL_MS);
  }

  throw new Error('Gateway extraction timed out');
}
