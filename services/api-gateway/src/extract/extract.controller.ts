import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';
import { ExtractService } from './extract.service';

@Controller()
export class ExtractController {
  constructor(private readonly extractService: ExtractService) {}

  @Post('v1/extract')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async createExtractJob(
    @Body() body: unknown,
    @Headers('x-request-id') incomingRequestId?: string
  ) {
    const requestId = incomingRequestId?.trim() || uuidv4();

    if (!body || typeof body !== 'object' || !('url' in body)) {
      throw new BadRequestException('Request body must include a url field');
    }

    try {
      return await this.extractService.createJob({
        url: String((body as { url: unknown }).url),
        requestId,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          error: 'Invalid URL',
          details: error.errors,
        });
      }
      throw error;
    }
  }

  @Get('v1/jobs/:jobId')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getJob(@Param('jobId') jobId: string) {
    return this.extractService.getJob(jobId);
  }
}
