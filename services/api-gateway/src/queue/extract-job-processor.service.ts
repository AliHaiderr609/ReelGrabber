import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { prisma } from '@reelgrabber/database';
import { parseGatewayEnv } from '@reelgrabber/config';
import { createLogger } from '@reelgrabber/logger';
import { recordExtractJob } from '@reelgrabber/monitoring';
import { Platform } from '@reelgrabber/types';
import {
  createExtractWorker,
  createRedisConnection,
  type ExtractQueueJobData,
} from '@reelgrabber/queue';
import type { Worker } from 'bullmq';

@Injectable()
export class ExtractJobProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger('extract-job-processor');
  private readonly env = parseGatewayEnv();
  private worker: Worker<ExtractQueueJobData> | null = null;
  private connection: ReturnType<typeof createRedisConnection> | null = null;

  onModuleInit(): void {
    if (!this.env.ENABLE_JOB_PROCESSOR) {
      this.logger.info('Job processor disabled (ENABLE_JOB_PROCESSOR=false)');
      return;
    }

    this.connection = createRedisConnection(this.env.REDIS_URL);
    this.worker = createExtractWorker(
      this.connection,
      async (job) => this.processJob(job.data),
      this.env.QUEUE_PREFIX
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        { jobId: job?.id, error: error.message },
        'Extract job failed in BullMQ worker'
      );
    });

    this.logger.info(
      { instagramWorkerUrl: this.env.INSTAGRAM_WORKER_URL },
      'Extract job processor started'
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async processJob(data: ExtractQueueJobData): Promise<unknown> {
    const started = Date.now();
    await prisma.downloadJob.update({
      where: { id: data.jobId },
      data: { status: 'PROCESSING', retries: { increment: 1 } },
    });
    recordExtractJob(data.platform, 'processing');

    try {
      const result = await this.dispatchToWorker(data);
      const durationMs = Date.now() - started;
      const durationSeconds = durationMs / 1000;

      await prisma.downloadJob.update({
        where: { id: data.jobId },
        data: {
          status: 'COMPLETED',
          result: result as object,
          durationMs,
          workerVersion: (result as { workerVersion?: string })?.workerVersion,
          completedAt: new Date(),
        },
      });

      recordExtractJob(data.platform, 'completed', durationSeconds);

      this.logger.info(
        {
          jobId: data.jobId,
          requestId: data.requestId,
          platform: data.platform,
          durationMs,
          cacheHit: false,
        },
        'Extract job completed'
      );

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown worker error';
      await prisma.downloadJob.update({
        where: { id: data.jobId },
        data: {
          status: 'FAILED',
          error: message,
          completedAt: new Date(),
        },
      });
      recordExtractJob(data.platform, 'failed');
      throw error;
    }
  }

  private async dispatchToWorker(data: ExtractQueueJobData): Promise<unknown> {
    const workerUrl = this.workerUrlForPlatform(data.platform);
    const response = await fetch(`${workerUrl}/v1/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': data.requestId,
      },
      body: JSON.stringify({ url: data.normalizedUrl }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Worker responded ${response.status}: ${body.slice(0, 200)}`);
    }

    return response.json();
  }

  private workerUrlForPlatform(platform: Platform): string {
    switch (platform) {
      case Platform.INSTAGRAM:
        return this.env.INSTAGRAM_WORKER_URL;
      default:
        throw new Error(`No worker configured for platform: ${platform}`);
    }
  }
}
