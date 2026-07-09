import { Platform } from '@reelgrabber/types';
import { JobStatus, MediaPlatform } from '@reelgrabber/database';
import type { JobStatus as ApiJobStatus } from '../queue/queue.interface';

const PLATFORM_TO_DB: Record<Platform, MediaPlatform | null> = {
  [Platform.INSTAGRAM]: MediaPlatform.INSTAGRAM,
  [Platform.TIKTOK]: MediaPlatform.TIKTOK,
  [Platform.FACEBOOK]: MediaPlatform.FACEBOOK,
  [Platform.TWITTER]: MediaPlatform.TWITTER,
  [Platform.PINTEREST]: MediaPlatform.PINTEREST,
  [Platform.THREADS]: MediaPlatform.THREADS,
  [Platform.UNKNOWN]: null,
};

const DB_TO_PLATFORM: Record<MediaPlatform, Platform> = {
  [MediaPlatform.INSTAGRAM]: Platform.INSTAGRAM,
  [MediaPlatform.TIKTOK]: Platform.TIKTOK,
  [MediaPlatform.FACEBOOK]: Platform.FACEBOOK,
  [MediaPlatform.TWITTER]: Platform.TWITTER,
  [MediaPlatform.PINTEREST]: Platform.PINTEREST,
  [MediaPlatform.THREADS]: Platform.THREADS,
};

export function toMediaPlatform(platform: Platform): MediaPlatform {
  const mapped = PLATFORM_TO_DB[platform];
  if (!mapped) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return mapped;
}

export function fromMediaPlatform(platform: MediaPlatform): Platform {
  return DB_TO_PLATFORM[platform];
}

export function toApiJobStatus(status: JobStatus): ApiJobStatus {
  switch (status) {
    case JobStatus.QUEUED:
      return 'queued';
    case JobStatus.PROCESSING:
      return 'processing';
    case JobStatus.COMPLETED:
      return 'completed';
    case JobStatus.FAILED:
      return 'failed';
    default:
      return 'queued';
  }
}

export function toDbJobStatus(status: ApiJobStatus): JobStatus {
  switch (status) {
    case 'queued':
      return JobStatus.QUEUED;
    case 'processing':
      return JobStatus.PROCESSING;
    case 'completed':
      return JobStatus.COMPLETED;
    case 'failed':
      return JobStatus.FAILED;
    default:
      return JobStatus.QUEUED;
  }
}
