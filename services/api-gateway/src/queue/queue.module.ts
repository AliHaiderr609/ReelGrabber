import { Module } from '@nestjs/common';
import { InMemoryQueueService } from './in-memory-queue.service';
import { BullMQQueueService } from './bullmq-queue.service';
import { ExtractJobProcessorService } from './extract-job-processor.service';
import { QUEUE_SERVICE } from './queue.interface';

@Module({
  providers: [
    InMemoryQueueService,
    BullMQQueueService,
    ExtractJobProcessorService,
    {
      provide: QUEUE_SERVICE,
      useClass: BullMQQueueService,
    },
  ],
  exports: [QUEUE_SERVICE, BullMQQueueService, ExtractJobProcessorService],
})
export class QueueModule {}
