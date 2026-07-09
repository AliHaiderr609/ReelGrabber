import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'redis';

// Redis client for rate limiting
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Rate limiter configuration
export const rateLimit = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl',
  points: 10, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 60 seconds if limit exceeded
});

// Different rate limits for different user tiers
export const createRateLimiter = (points: number, duration: number) => {
  return new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl_tier',
    points,
    duration,
    blockDuration: duration,
  });
};

// Rate limit tiers
export const rateLimitTiers = {
  free: createRateLimiter(5, 60), // 5 requests per minute
  pro: createRateLimiter(50, 60), // 50 requests per minute
  enterprise: createRateLimiter(200, 60), // 200 requests per minute
};
