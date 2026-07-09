import { Platform } from '@reelgrabber/types';
import { JobStatus, MediaPlatform } from '@reelgrabber/database';
import type { JobStatus as ApiJobStatus } from '../queue/queue.interface';
export declare function toMediaPlatform(platform: Platform): MediaPlatform;
export declare function fromMediaPlatform(platform: MediaPlatform): Platform;
export declare function toApiJobStatus(status: JobStatus): ApiJobStatus;
export declare function toDbJobStatus(status: ApiJobStatus): JobStatus;
//# sourceMappingURL=platform-mapper.d.ts.map