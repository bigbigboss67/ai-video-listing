import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, checkRateLimit, zodApiError } from '@/lib/api-error';
import {
  SAMPLE_LISTING_PRESETS,
  buildSlugFallbackExtraction,
  parseListingHtml,
  validatePublicListingUrl,
} from '@/lib/url-extractor';

const extractSchema = z.object({
  url: z.string().trim().min(4, 'Paste a valid property listing URL').max(2048),
  presetKey: z.enum(['palm', 'downtown', 'creek']).optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'local';
  const rl = checkRateLimit(`ai-extract:${ip}`, 25, 60_000);
  if (!rl.allowed) {
    return apiError(429, 'RATE_LIMITED', 'Too many URL extraction requests. Please wait.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }

  const parsed = extractSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error);
  }

  if (parsed.data.presetKey && SAMPLE_LISTING_PRESETS[parsed.data.presetKey]) {
    return NextResponse.json({
      listing: SAMPLE_LISTING_PRESETS[parsed.data.presetKey],
    });
  }

  const urlCheck = validatePublicListingUrl(parsed.data.url);
  if (!urlCheck.ok) {
    return apiError(400, 'INVALID_URL', urlCheck.reason);
  }

  const targetUrl = urlCheck.url.toString();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    const res = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MakanReelBot/1.0; +https://ai-video-listing.vercel.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      const fallback = buildSlugFallbackExtraction(
        targetUrl,
        `Source site returned HTTP ${res.status} (anti-bot protection). Parsed key listing attributes from the URL — review or attach photos below.`
      );
      return NextResponse.json({ listing: fallback });
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      const fallback = buildSlugFallbackExtraction(
        targetUrl,
        'URL did not return an HTML listing page. Pre-filled structured attributes from the link.'
      );
      return NextResponse.json({ listing: fallback });
    }

    const html = (await res.text()).slice(0, 350_000);
    const listing = parseListingHtml(html, targetUrl);
    return NextResponse.json({ listing });
  } catch {
    const fallback = buildSlugFallbackExtraction(
      targetUrl,
      'Could not fetch live HTML within timeout (or host blocked automated fetch). Parsed listing clues from the URL — edit details or drop photos below.'
    );
    return NextResponse.json({ listing: fallback });
  }
}
