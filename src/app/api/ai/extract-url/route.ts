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
    const timer = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      const fallback = buildSlugFallbackExtraction(
        targetUrl,
        `Source portal returned HTTP ${res.status}. Extracted listing clues from the URL — verify specs or upload photos below.`
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

    // Keep up to 1.8 MB so full Next.js __NEXT_DATA__ payloads (e.g., Property Finder / Bayut) are never truncated
    const html = (await res.text()).slice(0, 1_800_000);
    const listing = parseListingHtml(html, targetUrl);
    return NextResponse.json({ listing });
  } catch {
    const fallback = buildSlugFallbackExtraction(
      targetUrl,
      'Could not reach listing host within timeout. Parsed listing clues from the URL — edit specs or add photos below.'
    );
    return NextResponse.json({ listing: fallback });
  }
}
