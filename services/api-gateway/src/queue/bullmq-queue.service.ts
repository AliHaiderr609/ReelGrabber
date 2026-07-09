import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { prisma } from '@reelgrabber/database';
import {
  addExtractJob,
  createExtractQueue,
  createRedisConnection,
  type ExtractQueueJobData,
} from '@reelgrabber/queue';
import { parseGatewayEnv } from '@reelgrabber/config';
import {
  EnqueueResult,
  ExtractJobPayload,
  ExtractJobRecord,
  QueueService,
} from './queue.interface';
import { fromMediaPlatform, toApiJobStatus, toMediaPlatform } from '../common/platform-mapper';

@Injectable()
export class BullMQQueueService extends QueueService implements OnModuleDestroy {
  private readonly env = parseGatewayEnv();
  private readonly connection = createRedisConnection(this.env.REDIS_URL);
  private readonly queue = createExtractQueue(this.connection, this.env.QUEUE_PREFIX);

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }

  async enqueue(payload: ExtractJobPayload): Promise<EnqueueResult> {
    const platform = toMediaPlatform(payload.platform);

    await prisma.downloadJob.create({
      data: {
        id: payload.jobId,
        requestId: payload.requestId,
        url: payload.url,
        normalizedUrl: payload.normalizedUrl,
        platform,
        status: 'QUEUED',
        bullJobId: payload.jobId,
      },
    });

    const queueData: ExtractQueueJobData = {
      jobId: payload.jobId,
      requestId: payload.requestId,
      url: payload.url,
      normalizedUrl: payload.normalizedUrl,
      platform: payload.platform,
      enqueuedAt: payload.enqueuedAt,
    };

    await addExtractJob(this.queue, queueData);

    return { jobId: payload.jobId, status: 'queued' };
  }

  async getJob(jobId: string): Promise<ExtractJobRecord | null> {
    const job = await prisma.downloadJob.findUnique({ where: { id: jobId } });
    if (!job) return null;

    return {
      jobId: job.id,
      requestId: job.requestId,
      url: job.url,
      normalizedUrl: job.normalizedUrl,
      platform: fromMediaPlatform(job.platform),
      enqueuedAt: job.createdAt.toISOString(),
      status: toApiJobStatus(job.status),
      updatedAt: job.updatedAt.toISOString(),
      error: job.error ?? undefined,
      result: job.result ?? undefined,
    };
  }
}
