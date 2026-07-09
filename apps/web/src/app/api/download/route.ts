import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { instagramDownloadRequestSchema } from '@reelgrabber/validation';
import { extractViaGateway, isGatewayExtractEnabled } from '@/lib/gateway-client';
import { extractInstagramContent } from '@/lib/instagram-extractor';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    // const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    // const { success } = await rateLimit.limit(ip);
    
    // if (!success) {
    //   return NextResponse.json(
    //     { error: 'Rate limit exceeded. Please try again later.' },
    //     { status: 429 }
    //   );
    // }

    // Get raw body text first to check if it's empty
    const bodyText = await request.text();
    
    if (!bodyText || bodyText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Request body is empty' },
        { status: 400 }
      );
    }

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (error) {
      console.error('JSON parse error:', error, 'Body text:', bodyText.substring(0, 100));
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { url } = instagramDownloadRequestSchema.parse(body);

    console.log(`Extracting content from URL: ${url}`);

    if (isGatewayExtractEnabled()) {
      try {
        const { results, jobId } = await extractViaGateway(url);
        if (results.length > 0) {
          return NextResponse.json({
            success: true,
            results,
            timestamp: new Date().toISOString(),
            jobId,
            source: 'gateway',
          });
        }
        console.warn('Gateway returned no items, falling back to legacy extractor');
      } catch (gatewayError) {
        console.warn('Gateway extract failed, falling back to legacy:', gatewayError);
      }
    }

    const results = await extractInstagramContent(url);

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
      source: 'legacy',
    });

  } catch (error) {
    console.error('Download error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid URL format', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to extract content. Please try again.' },
      { status: 500 }
    );
  }
}
