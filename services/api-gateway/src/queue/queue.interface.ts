import { Platform } from '@reelgrabber/types';

/** Payload enqueued for a platform worker (Phase 5: persisted in BullMQ). */
export interface ExtractJobPayload {
  jobId: string;
  requestId: string;
  url: string;
  normalizedUrl: string;
  platform: Platform;
  enqueuedAt: string;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ExtractJobRecord extends ExtractJobPayload {
  status: JobStatus;
  updatedAt: string;
  error?: string;
  result?: unknown;
}

export interface EnqueueResult {
  jobId: string;
  status: JobStatus;
}

export abstract class QueueService {
  abstract enqueue(payload: ExtractJobPayload): Promise<EnqueueResult>;
  abstract getJob(jobId: string): Promise<ExtractJobRecord | null>;
}

export const QUEUE_SERVICE = Symbol('QUEUE_SERVICE');
