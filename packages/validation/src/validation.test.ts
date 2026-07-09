import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';
import { Platform } from '@reelgrabber/types';
import {
  detectPlatform,
  normalizeMediaUrl,
  isPublicHttpUrl,
  isAllowedMediaHost,
} from './index';

describe('detectPlatform', () => {
  it('detects Instagram reel URLs', () => {
    strictEqual(
      detectPlatform('https://www.instagram.com/reel/ABC123/'),
      Platform.INSTAGRAM
    );
  });

  it('detects TikTok URLs', () => {
    strictEqual(
      detectPlatform('https://www.tiktok.com/@user/video/123'),
      Platform.TIKTOK
    );
  });

  it('returns UNKNOWN for unsupported hosts', () => {
    strictEqual(detectPlatform('https://example.com/video'), Platform.UNKNOWN);
  });
});

describe('normalizeMediaUrl', () => {
  it('strips utm and igsh query params', () => {
    const normalized = normalizeMediaUrl(
      'https://www.instagram.com/reel/ABC/?utm_source=ig_web&igsh=abc123'
    );
    strictEqual(normalized, 'https://www.instagram.com/reel/ABC');
  });
});

describe('isPublicHttpUrl', () => {
  it('allows public https URLs', () => {
    strictEqual(isPublicHttpUrl('https://www.instagram.com/reel/ABC/'), true);
  });

  it('blocks localhost', () => {
    strictEqual(isPublicHttpUrl('http://localhost:3000/internal'), false);
  });

  it('blocks private IP ranges', () => {
    strictEqual(isPublicHttpUrl('http://192.168.1.1/file'), false);
    strictEqual(isPublicHttpUrl('http://10.0.0.1/file'), false);
  });
});

describe('isAllowedMediaHost', () => {
  it('allows Instagram CDN hosts', () => {
    strictEqual(
      isAllowedMediaHost('https://scontent-dfw6-1.cdninstagram.com/v/t51.mp4'),
      true
    );
  });

  it('rejects arbitrary hosts', () => {
    strictEqual(isAllowedMediaHost('https://evil.example.com/file.mp4'), false);
  });
});
