import { Platform } from '@reelgrabber/types';

export const EXTRACT_QUEUE_NAME = 'extract';

/** Job payload stored in BullMQ (mirrors gateway ExtractJobPayload). */
export interface ExtractQueueJobData {
  jobId: string;
  requestId: string;
  url: string;
  normalizedUrl: string;
  platform: Platform;
  enqueuedAt: string;
}

export const DEFAULT_QUEUE_PREFIX = 'reelgrabber';
