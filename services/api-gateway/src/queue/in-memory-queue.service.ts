import { Injectable } from '@nestjs/common';
import {
  EnqueueResult,
  ExtractJobPayload,
  ExtractJobRecord,
  QueueService,
} from './queue.interface';

/**
 * In-memory queue stub for Phase 3.
 * Replaced by BullMQ + Redis in Phase 5 without changing ExtractService.
 */
@Injectable()
export class InMemoryQueueService extends QueueService {
  private readonly jobs = new Map<string, ExtractJobRecord>();

  async enqueue(payload: ExtractJobPayload): Promise<EnqueueResult> {
    const record: ExtractJobRecord = {
      ...payload,
      status: 'queued',
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(payload.jobId, record);
    return { jobId: payload.jobId, status: 'queued' };
  }

  async getJob(jobId: string): Promise<ExtractJobRecord | null> {
    return this.jobs.get(jobId) ?? null;
  }
}
