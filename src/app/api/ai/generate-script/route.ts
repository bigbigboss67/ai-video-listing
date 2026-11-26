import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, zodApiError } from '@/lib/api-error';
import { generatePropertyStoryboard } from '@/lib/url-extractor';

const scriptRequestSchema = z.object({
  style: z.enum(['walkthrough', 'reels_vertical', 'investor_briefing']).default('walkthrough'),
  locale: z.enum(['en', 'ar']).default('en'),
  listing: z.object({
    titleEn: z.string().min(2),
    titleAr: z.string().optional().default(''),
    community: z.string().min(2),
    buildingName: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    propertyType: z.enum([
      'apartment',
      'villa',
      'townhouse',
      'penthouse',
      'plot',
      'commercial',
      'off_plan_project',
    ]),
    price: z.coerce.number().positive(),
    currency: z.enum(['AED', 'USD', 'EUR', 'GBP']).default('AED'),
    bedrooms: z.coerce.number().int().min(0),
    bathrooms: z.coerce.number().int().min(0),
    areaSqft: z.coerce.number().positive(),
    status: z.enum(['ready', 'off_plan', 'rent', 'reserved', 'sold']),
    permitNumber: z.string().min(4),
    estNetYieldPct: z.coerce.number().min(0).max(40).default(7.4),
    imageUrls: z.array(z.string()).optional().default([]),
  }),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'INVALID_JSON', 'Invalid JSON body.');
  }

  const parsed = scriptRequestSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error);
  }

  const storyboard = generatePropertyStoryboard({
    listing: parsed.data.listing,
    style: parsed.data.style,
    locale: parsed.data.locale,
  });

  return NextResponse.json({ storyboard });
}
