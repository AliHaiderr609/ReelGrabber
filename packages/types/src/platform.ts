/** Supported media platforms. Workers and the gateway route jobs by this enum. */
export enum Platform {
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  PINTEREST = 'pinterest',
  THREADS = 'threads',
  UNKNOWN = 'unknown',
}

export const SUPPORTED_PLATFORMS = [
  Platform.INSTAGRAM,
  Platform.TIKTOK,
  Platform.FACEBOOK,
  Platform.TWITTER,
  Platform.PINTEREST,
  Platform.THREADS,
] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];
