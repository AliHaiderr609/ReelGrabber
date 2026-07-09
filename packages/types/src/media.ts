import type { Platform } from './platform';

/** Content type within a platform (e.g. reel vs photo on Instagram). */
export type MediaContentType =
  | 'video'
  | 'photo'
  | 'reel'
  | 'story'
  | 'igtv'
  | 'carousel';

/** A single downloadable media item returned by a worker. */
export interface MediaItem {
  type: MediaContentType;
  url: string;
  thumbnail?: string;
  title?: string;
  duration?: string;
  size?: string;
  author?: string;
  description?: string;
  quality?: string;
  width?: number;
  height?: number;
}

/** Structured extraction response from a platform worker. */
export interface ExtractionResult {
  platform: Platform;
  normalizedUrl: string;
  items: MediaItem[];
  metadata?: Record<string, unknown>;
  workerVersion?: string;
  cached?: boolean;
}

/** API response shape returned to the frontend (backward compatible with apps/web). */
export interface DownloadApiResponse {
  success: boolean;
  results: MediaItem[];
  timestamp: string;
  platform?: Platform;
  jobId?: string;
}
