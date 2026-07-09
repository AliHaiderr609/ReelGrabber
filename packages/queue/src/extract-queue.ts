import {
  Queue,
  Worker,
  type ConnectionOptions,
  type Job,
  type JobsOptions,
} from 'bullmq';
import {
  DEFAULT_QUEUE_PREFIX,
  EXTRACT_QUEUE_NAME,
  type ExtractQueueJobData,
} from './constants';

export type RedisConnection = ConnectionOptions;

export function createRedisConnection(redisUrl: string): RedisConnection {
  return {
    url: redisUrl,
    maxRetriesPerRequest: null,
  };
}

export function createExtractQueue(
  connection: RedisConnection,
  prefix: string = DEFAULT_QUEUE_PREFIX
): Queue<ExtractQueueJobData> {
  return new Queue(EXTRACT_QUEUE_NAME, {
    connection,
    prefix,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  });
}

export function createExtractWorker(
  connection: RedisConnection,
  processor: (job: Job<ExtractQueueJobData>) => Promise<unknown>,
  prefix: string = DEFAULT_QUEUE_PREFIX
): Worker<ExtractQueueJobData> {
  return new Worker(EXTRACT_QUEUE_NAME, processor, {
    connection,
    prefix,
  });
}

export async function addExtractJob(
  queue: Queue<ExtractQueueJobData>,
  data: ExtractQueueJobData,
  options?: JobsOptions
): Promise<Job<ExtractQueueJobData>> {
  return queue.add(`extract-${data.platform}`, data, {
    jobId: data.jobId,
    ...options,
  });
}

export * from './constants';
