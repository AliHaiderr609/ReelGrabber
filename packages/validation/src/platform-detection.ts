import { Platform } from '@reelgrabber/types';

interface PlatformPattern {
  platform: Platform;
  hostPatterns: RegExp[];
}

const PLATFORM_PATTERNS: PlatformPattern[] = [
  {
    platform: Platform.INSTAGRAM,
    hostPatterns: [/^(www\.)?instagram\.com$/i],
  },
  {
    platform: Platform.TIKTOK,
    hostPatterns: [/^(www\.)?tiktok\.com$/i, /^vm\.tiktok\.com$/i],
  },
  {
    platform: Platform.FACEBOOK,
    hostPatterns: [/^(www\.)?facebook\.com$/i, /^fb\.watch$/i, /^m\.facebook\.com$/i],
  },
  {
    platform: Platform.TWITTER,
    hostPatterns: [/^(www\.)?twitter\.com$/i, /^(www\.)?x\.com$/i],
  },
  {
    platform: Platform.PINTEREST,
    hostPatterns: [/^(www\.)?pinterest\.com$/i, /^pin\.it$/i],
  },
  {
    platform: Platform.THREADS,
    hostPatterns: [/^(www\.)?threads\.net$/i],
  },
];

/** Detect platform from a media URL hostname. */
export function detectPlatform(url: string): Platform {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const { platform, hostPatterns } of PLATFORM_PATTERNS) {
      if (hostPatterns.some((pattern) => pattern.test(hostname) || pattern.test(`www.${hostname}`))) {
        return platform;
      }
    }
    return Platform.UNKNOWN;
  } catch {
    return Platform.UNKNOWN;
  }
}

/** Strip tracking query params and trailing slashes for stable cache keys. */
export function normalizeMediaUrl(url: string): string {
  const parsed = new URL(url);
  const trackingParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'igsh',
    'igshid',
    'fbclid',
  ];
  for (const param of trackingParams) {
    parsed.searchParams.delete(param);
  }
  let normalized = parsed.toString();
  if (normalized.endsWith('/') && parsed.pathname !== '/') {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}
