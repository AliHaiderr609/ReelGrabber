import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JobStatus, MediaPlatform } from '@reelgrabber/database';
import { Platform } from '@reelgrabber/types';
import {
  fromMediaPlatform,
  toApiJobStatus,
  toMediaPlatform,
} from './platform-mapper';

describe('platform-mapper', () => {
  it('maps Platform to MediaPlatform and back', () => {
    assert.equal(toMediaPlatform(Platform.INSTAGRAM), MediaPlatform.INSTAGRAM);
    assert.equal(fromMediaPlatform(MediaPlatform.TIKTOK), Platform.TIKTOK);
  });

  it('maps Prisma JobStatus to API job status', () => {
    assert.equal(toApiJobStatus(JobStatus.QUEUED), 'queued');
    assert.equal(toApiJobStatus(JobStatus.COMPLETED), 'completed');
    assert.equal(toApiJobStatus(JobStatus.FAILED), 'failed');
  });

  it('throws for unsupported platforms', () => {
    assert.throws(() => toMediaPlatform(Platform.UNKNOWN));
  });
});
