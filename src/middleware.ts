import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import {
  ANTI_SCRAPER_HEADERS,
  evaluateAntiScraper,
  getClientIpFromHeaders,
} from './lib/anti-scraper';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIpFromHeaders(request.headers);
  const userAgent = request.headers.get('user-agent') ?? '';

  // Allow Stripe/Cloudflare webhooks through UA check (verified via cryptographic signature in route handler)
  const isWebhook = pathname.startsWith('/api/webhooks/');
  if (!isWebhook) {
    const verdict = evaluateAntiScraper({
      pathname,
      method: request.method,
      userAgent,
      ip,
    });

    if (verdict.blocked) {
      const res = NextResponse.json(
        {
          error: {
            code: verdict.reason ?? 'ACCESS_DENIED',
            message:
              verdict.status === 429
                ? 'Rate limit exceeded. Please slow down and try again.'
                : 'Automated scraping and unauthorized bot access are prohibited.',
          },
        },
        { status: verdict.status }
      );
      if (verdict.retryAfterSec) {
        res.headers.set('Retry-After', String(verdict.retryAfterSec));
      }
      for (const [k, v] of Object.entries(ANTI_SCRAPER_HEADERS)) {
        res.headers.set(k, v);
      }
      return res;
    }
  }

  // API routes skip next-intl locale redirect, but still receive anti-scraper security headers
  if (pathname.startsWith('/api/')) {
    const res = NextResponse.next();
    for (const [k, v] of Object.entries(ANTI_SCRAPER_HEADERS)) {
      res.headers.set(k, v);
    }
    res.headers.set('X-Robots-Tag', 'noindex, nofollow, noai, noimageai');
    return res;
  }

  const response = intlMiddleware(request);
  for (const [k, v] of Object.entries(ANTI_SCRAPER_HEADERS)) {
    response.headers.set(k, v);
  }
  return response;
}

export const config = {
  matcher: ['/', '/(en|ar)/:path*', '/api/:path*', '/wp-login.php', '/.env'],
};
