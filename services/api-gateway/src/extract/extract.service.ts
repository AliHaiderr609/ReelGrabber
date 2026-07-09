import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Platform } from '@reelgrabber/types';
import {
  detectPlatform,
  downloadRequestSchema,
  normalizeMediaUrl,
} from '@reelgrabber/validation';
import { createLogger } from '@reelgrabber/logger';
import { recordExtractJob } from '@reelgrabber/monitoring';
import {
  QUEUE_SERVICE,
  QueueService,
  ExtractJobRecord,
} from '../queue/queue.interface';

export interface CreateExtractJobInput {
  url: string;
  requestId: string;
}

export interface CreateExtractJobResult {
  jobId: string;
  requestId: string;
  platform: Platform;
  normalizedUrl: string;
  status: 'queued';
  enqueuedAt: string;
}

@Injectable()
export class ExtractService {
  private readonly logger = createLogger('extract-service');

  constructor(@Inject(QUEUE_SERVICE) private readonly queue: QueueService) {}

  async createJob(input: CreateExtractJobInput): Promise<CreateExtractJobResult> {
    const started = Date.now();
    const { url } = downloadRequestSchema.parse({ url: input.url });
    const platform = detectPlatform(url);
    const normalizedUrl = normalizeMediaUrl(url);
    const jobId = uuidv4();
    const enqueuedAt = new Date().toISOString();

    await this.queue.enqueue({
      jobId,
      requestId: input.requestId,
      url,
      normalizedUrl,
      platform,
      enqueuedAt,
    });

    recordExtractJob(platform, 'queued');

    const durationMs = Date.now() - started;
    this.logger.info(
      {
        requestId: input.requestId,
        jobId,
        platform,
        durationMs,
        cacheHit: false,
        workerVersion: 'n/a',
      },
      'Extract job enqueued'
    );

    return {
      jobId,
      requestId: input.requestId,
      platform,
      normalizedUrl,
      status: 'queued',
      enqueuedAt,
    };
  }

  async getJob(jobId: string): Promise<ExtractJobRecord> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }
    return job;
  }
}
