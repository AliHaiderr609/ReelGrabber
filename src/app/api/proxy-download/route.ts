import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting for proxy downloads
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    // const { success } = await rateLimit.limit(ip);
    
    // if (!success) {
    //   return NextResponse.json(
    //     { error: 'Rate limit exceeded' },
    //     { status: 429 }
    //   );
    // }

    const { searchParams } = new URL(request.url);
    const downloadUrl = searchParams.get('url');

    if (!downloadUrl) {
      return NextResponse.json(
        { error: 'Download URL is required' },
        { status: 400 }
      );
    }

    // Fetch the file
    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.instagram.com/',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="instagram-content-${Date.now()}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Proxy download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
