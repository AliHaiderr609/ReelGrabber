import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface BotDetectionResult {
  isBot: boolean;
  confidence: number;
  reasons: string[];
}

export interface UserBehavior {
  ipAddress: string;
  userAgent: string;
  requestCount: number;
  timeWindow: number;
  suspiciousPatterns: string[];
}

export async function detectBot(request: NextRequest): Promise<BotDetectionResult> {
  const ipAddress = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const reasons: string[] = [];
  let confidence = 0;

  // Check for known bot user agents
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i, /curl/i, /wget/i,
    /python/i, /java/i, /php/i, /go-http/i, /okhttp/i, /axios/i,
    /headless/i, /phantom/i, /selenium/i, /puppeteer/i, /playwright/i
  ];

  const isKnownBot = botPatterns.some(pattern => pattern.test(userAgent));
  if (isKnownBot) {
    confidence += 40;
    reasons.push('Known bot user agent detected');
  }

  // Check for missing or suspicious user agent
  if (!userAgent || userAgent.length < 10) {
    confidence += 30;
    reasons.push('Missing or suspicious user agent');
  }

  // Check for missing common headers
  const acceptLanguage = request.headers.get('accept-language');
  const acceptEncoding = request.headers.get('accept-encoding');
  const accept = request.headers.get('accept');

  if (!acceptLanguage || !acceptEncoding || !accept) {
    confidence += 20;
    reasons.push('Missing common browser headers');
  }

  // Check request frequency
  const recentRequests = await getRecentRequestCount(ipAddress, 60); // Last minute
  if (recentRequests > 20) {
    confidence += 25;
    reasons.push('High request frequency detected');
  }

  // Check for suspicious request patterns
  const suspiciousPatterns = await analyzeRequestPatterns(ipAddress);
  if (suspiciousPatterns.length > 0) {
    confidence += suspiciousPatterns.length * 10;
    reasons.push(...suspiciousPatterns);
  }

  // Check for CAPTCHA bypass attempts
  const captchaAttempts = await getCaptchaAttempts(ipAddress, 300); // Last 5 minutes
  if (captchaAttempts > 3) {
    confidence += 35;
    reasons.push('Multiple CAPTCHA bypass attempts');
  }

  return {
    isBot: confidence > 50,
    confidence,
    reasons,
  };
}

export async function getRecentRequestCount(ipAddress: string, seconds: number): Promise<number> {
  const since = new Date(Date.now() - seconds * 1000);
  
  return prisma.download.count({
    where: {
      ipAddress,
      createdAt: {
        gte: since,
      },
    },
  });
}

export async function analyzeRequestPatterns(ipAddress: string): Promise<string[]> {
  const patterns: string[] = [];
  
  // Get recent downloads
  const recentDownloads = await prisma.download.findMany({
    where: {
      ipAddress,
      createdAt: {
        gte: new Date(Date.now() - 3600000), // Last hour
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Check for identical URLs (scraping pattern)
  const urlCounts = new Map<string, number>();
  recentDownloads.forEach(download => {
    urlCounts.set(download.url, (urlCounts.get(download.url) || 0) + 1);
  });

  const duplicateUrls = Array.from(urlCounts.entries()).filter(([_, count]) => count > 5);
  if (duplicateUrls.length > 0) {
    patterns.push('Repeated URL access pattern detected');
  }

  // Check for rapid sequential requests
  if (recentDownloads.length > 10) {
    const timeGaps = [];
    for (let i = 1; i < recentDownloads.length; i++) {
      const gap = recentDownloads[i-1].createdAt.getTime() - recentDownloads[i].createdAt.getTime();
      timeGaps.push(gap);
    }
    
    const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
    if (avgGap < 1000) { // Less than 1 second between requests
      patterns.push('Rapid sequential requests detected');
    }
  }

  // Check for content type patterns
  const contentTypeCounts = new Map<string, number>();
  recentDownloads.forEach(download => {
    contentTypeCounts.set(download.contentType, (contentTypeCounts.get(download.contentType) || 0) + 1);
  });

  const singleContentType = contentTypeCounts.size === 1 && recentDownloads.length > 5;
  if (singleContentType) {
    patterns.push('Single content type pattern detected');
  }

  return patterns;
}

export async function getCaptchaAttempts(ipAddress: string, seconds: number): Promise<number> {
  const since = new Date(Date.now() - seconds * 1000);
  
  // This would be implemented with a separate CAPTCHA attempts table
  // For now, we'll use a simple approach
  return 0;
}

export async function logSuspiciousActivity(
  ipAddress: string,
  userAgent: string,
  reason: string,
  metadata?: any
) {
  await prisma.rateLimit.upsert({
    where: {
      identifier_tier: {
        identifier: ipAddress,
        tier: 'FREE', // Default tier for suspicious activity
      },
    },
    update: {
      count: { increment: 1 },
    },
    create: {
      identifier: ipAddress,
      tier: 'FREE',
      count: 1,
    },
  });

  // Log to analytics
  console.log('Suspicious activity detected:', {
    ipAddress,
    userAgent,
    reason,
    metadata,
    timestamp: new Date().toISOString(),
  });
}

export async function shouldShowCaptcha(ipAddress: string): Promise<boolean> {
  const botDetection = await detectBot({ 
    ip: ipAddress,
    headers: new Headers(),
  } as NextRequest);
  
  const recentRequests = await getRecentRequestCount(ipAddress, 300); // Last 5 minutes
  
  return botDetection.isBot || recentRequests > 10;
}

export async function validateCaptcha(token: string, ipAddress: string): Promise<boolean> {
  // Implement CAPTCHA validation (reCAPTCHA, hCaptcha, etc.)
  // For now, return true as a placeholder
  return true;
}
