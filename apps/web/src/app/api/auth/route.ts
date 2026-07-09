import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIp } from '@reelgrabber/shared';
import { registerSchema, loginSchema, createUser, authenticateUser, generateToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@reelgrabber/database';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting for auth endpoints
    const ip = getClientIp(request.headers);
    try {
      await rateLimit.consume(ip);
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'register') {
      const data = registerSchema.parse(body);
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'User already exists with this email' },
          { status: 400 }
        );
      }

      const user = await createUser(data);
      const token = generateToken(user);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          tier: user.tier,
        },
        token,
      });

    } else if (action === 'login') {
      const data = loginSchema.parse(body);
      const user = await authenticateUser(data);

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      const token = generateToken(user);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          tier: user.tier,
        },
        token,
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Auth error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
