/** Block SSRF targets: private networks, localhost, and non-http(s) schemes. */
export function isPublicHttpUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  ) {
    return false;
  }

  // IPv4 private/reserved ranges
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 0) return false;
  }

  return true;
}

/** Hostnames allowed for outbound media fetches (proxy-download, workers). */
export const ALLOWED_MEDIA_HOSTS = [
  'instagram.com',
  'cdninstagram.com',
  'fbcdn.net',
  'tiktokcdn.com',
  'tiktokv.com',
  'facebook.com',
  'fb.watch',
  'twitter.com',
  'x.com',
  'twimg.com',
  'pinimg.com',
  'pinterest.com',
  'threads.net',
] as const;

export function isAllowedMediaHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return ALLOWED_MEDIA_HOSTS.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}
