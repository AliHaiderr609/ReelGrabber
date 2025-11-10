import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient, UserTier } from '@prisma/client';

const prisma = new PrismaClient();

export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export const JWT_EXPIRES_IN = '7d';

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20).optional(),
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  tier: UserTier;
  apiKey?: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      tier: user.tier 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
      tier: decoded.tier,
    };
  } catch (error) {
    return null;
  }
}

export async function createUser(data: z.infer<typeof registerSchema>): Promise<AuthUser> {
  const hashedPassword = await hashPassword(data.password);
  
  const user = await prisma.user.create({
    data: {
      email: data.email,
      username: data.username,
      password: hashedPassword,
      tier: UserTier.FREE,
    },
  });

  return {
    id: user.id,
    email: user.email,
    username: user.username || undefined,
    tier: user.tier,
  };
}

export async function authenticateUser(data: z.infer<typeof loginSchema>): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    return null;
  }

  const isValidPassword = await verifyPassword(data.password, user.password);
  if (!isValidPassword) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username || undefined,
    tier: user.tier,
    apiKey: user.apiKey || undefined,
  };
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      tier: true,
      apiKey: true,
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username || undefined,
    tier: user.tier,
    apiKey: user.apiKey || undefined,
  };
}

export async function generateApiKey(userId: string): Promise<string> {
  const apiKey = `sk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  
  await prisma.user.update({
    where: { id: userId },
    data: { apiKey },
  });

  return apiKey;
}

export async function revokeApiKey(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { apiKey: null },
  });
}

export async function upgradeUserTier(userId: string, tier: UserTier): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tier },
  });
}

export async function getUserUsageStats(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [downloads, apiUsage] = await Promise.all([
    prisma.download.count({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
    }),
    prisma.apiUsage.count({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
    }),
  ]);

  return {
    downloads,
    apiCalls: apiUsage,
    period: `${days} days`,
  };
}
