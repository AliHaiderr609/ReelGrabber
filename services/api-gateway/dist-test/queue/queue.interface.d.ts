import { Platform } from '@reelgrabber/types';
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
export declare abstract class QueueService {
    abstract enqueue(payload: ExtractJobPayload): Promise<EnqueueResult>;
    abstract getJob(jobId: string): Promise<ExtractJobRecord | null>;
}
export declare const QUEUE_SERVICE: unique symbol;
//# sourceMappingURL=queue.interface.d.ts.map