import { NextResponse } from 'next/server';
import { validatePublicListingUrl } from '@/lib/url-extractor';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Same-origin, SSRF-protected image proxy so external listing photos
 * (e.g., Property Finder / Bayut CDNs without CORS headers) render crisply
 * inside the studio gallery and HTML5 Canvas video renderer without tainting.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const check = validatePublicListingUrl(rawUrl);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch(check.url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/jpeg,image/png,*/*;q=0.8',
      },
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream image returned ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.json(
        { error: 'URL did not return an image asset' },
        { status: 415 }
      );
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'Image size out of permitted bounds' },
        { status: 413 }
      );
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to proxy upstream image' },
      { status: 504 }
    );
  }
}
