import { z } from 'zod';
import { Platform } from '@reelgrabber/types';
import { detectPlatform } from './platform-detection';
import { isPublicHttpUrl } from './ssrf';

const publicHttpUrl = z
  .string()
  .url('Must be a valid URL')
  .refine(isPublicHttpUrl, 'URL must use http(s) and must not target private networks');

/** Preserves exact behavior of the legacy apps/web download API (Instagram only). */
export const instagramDownloadRequestSchema = z.object({
  url: publicHttpUrl.refine(
    (url) => url.includes('instagram.com'),
    'URL must be from Instagram'
  ),
});

/** Multi-platform download request for the future NestJS gateway. */
export const downloadRequestSchema = z.object({
  url: publicHttpUrl.refine((url) => detectPlatform(url) !== Platform.UNKNOWN, {
    message: 'URL must be from a supported platform',
  }),
});

export type InstagramDownloadRequest = z.infer<typeof instagramDownloadRequestSchema>;
export type DownloadRequest = z.infer<typeof downloadRequestSchema>;

export { detectPlatform, normalizeMediaUrl } from './platform-detection';
export { isPublicHttpUrl, isAllowedMediaHost, ALLOWED_MEDIA_HOSTS } from './ssrf';
