import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function isValidInstagramUrl(url: string): boolean {
  const instagramPatterns = [
    /^https?:\/\/(www\.)?instagram\.com\/p\/[A-Za-z0-9_-]+\/?$/,
    /^https?:\/\/(www\.)?instagram\.com\/reel\/[A-Za-z0-9_-]+\/?$/,
    /^https?:\/\/(www\.)?instagram\.com\/tv\/[A-Za-z0-9_-]+\/?$/,
    /^https?:\/\/(www\.)?instagram\.com\/stories\/[A-Za-z0-9_.-]+\/[0-9]+\/?$/,
  ];

  return instagramPatterns.some(pattern => pattern.test(url));
}

export function extractInstagramId(url: string): string | null {
  const patterns = [
    /\/p\/([A-Za-z0-9_-]+)/,
    /\/reel\/([A-Za-z0-9_-]+)/,
    /\/tv\/([A-Za-z0-9_-]+)/,
    /\/stories\/[A-Za-z0-9_.-]+\/([0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export function generateFilename(type: string, id: string, extension: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `instagram-${type}-${id}-${timestamp}.${extension}`;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
  ];
  
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9.-]/gi, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

export function getContentTypeFromUrl(url: string): 'video' | 'photo' | 'reel' | 'story' | 'igtv' {
  if (url.includes('/reel/')) return 'reel';
  if (url.includes('/tv/')) return 'igtv';
  if (url.includes('/stories/')) return 'story';
  if (url.includes('.mp4') || url.includes('video')) return 'video';
  return 'photo';
}

export function calculateFileSize(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('HEAD', url, true);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          const contentLength = xhr.getResponseHeader('Content-Length');
          resolve(contentLength ? parseInt(contentLength, 10) : 0);
        } else {
          reject(new Error('Failed to get file size'));
        }
      }
    };
    xhr.send();
  });
}

export function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  return fn().catch((error) => {
    if (retries > 0) {
      return sleep(delay).then(() => retry(fn, retries - 1, delay * 2));
    }
    throw error;
  });
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function parseInstagramUrl(url: string): {
  type: 'post' | 'reel' | 'igtv' | 'story';
  id: string;
  username?: string;
} | null {
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('instagram.com')) {
      return null;
    }

    const pathname = urlObj.pathname;
    
    // Post: /p/ID/
    const postMatch = pathname.match(/^\/p\/([A-Za-z0-9_-]+)\/?$/);
    if (postMatch) {
      return { type: 'post', id: postMatch[1] };
    }

    // Reel: /reel/ID/
    const reelMatch = pathname.match(/^\/reel\/([A-Za-z0-9_-]+)\/?$/);
    if (reelMatch) {
      return { type: 'reel', id: reelMatch[1] };
    }

    // IGTV: /tv/ID/
    const igtvMatch = pathname.match(/^\/tv\/([A-Za-z0-9_-]+)\/?$/);
    if (igtvMatch) {
      return { type: 'igtv', id: igtvMatch[1] };
    }

    // Story: /stories/USERNAME/ID/
    const storyMatch = pathname.match(/^\/stories\/([A-Za-z0-9_.-]+)\/([0-9]+)\/?$/);
    if (storyMatch) {
      return { type: 'story', id: storyMatch[2], username: storyMatch[1] };
    }

    return null;
  } catch {
    return null;
  }
}
