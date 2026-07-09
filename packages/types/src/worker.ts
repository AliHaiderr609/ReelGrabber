import type { Platform } from './platform';
import type { ExtractionResult, MediaItem } from './media';

/** Contract every platform worker must implement (HTTP or queue consumer). */
export interface PlatformWorkerContract {
  validate(url: string): Promise<boolean>;
  normalize(url: string): Promise<string>;
  extractMetadata(url: string): Promise<Record<string, unknown>>;
  extractMedia(url: string): Promise<MediaItem[]>;
  extractThumbnail(url: string): Promise<string | null>;
  extractAuthor(url: string): Promise<string | null>;
  extractDuration(url: string): Promise<number | null>;
  extractQualities(url: string): Promise<string[]>;
}

export interface WorkerHealthResponse {
  status: 'ok' | 'degraded' | 'down';
  platform: Platform;
  version: string;
  uptimeSeconds?: number;
}

export interface WorkerExtractRequest {
  url: string;
  requestId?: string;
}

export interface WorkerExtractResponse extends ExtractionResult {
  requestId?: string;
  durationMs?: number;
  retries?: number;
}
