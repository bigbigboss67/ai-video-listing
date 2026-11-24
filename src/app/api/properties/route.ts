import { NextResponse } from 'next/server';
import { canCreateProperty, canViewDashboard, getCurrentSessionUser } from '@/lib/auth';
import { apiError, checkRateLimit, zodApiError } from '@/lib/api-error';
import { createProperty, listProperties } from '@/lib/store';
import { createPropertySchema } from '@/lib/validation';
import type { PropertyStatus, PropertyType } from '@/types/domain';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? undefined;
  const propertyType = (searchParams.get('propertyType') as PropertyType | 'all' | null) ?? undefined;
  const status = (searchParams.get('status') as PropertyStatus | 'all' | null) ?? undefined;
  const minPriceAed = searchParams.get('minPriceAed')
    ? Number(searchParams.get('minPriceAed'))
    : undefined;
  const maxPriceAed = searchParams.get('maxPriceAed')
    ? Number(searchParams.get('maxPriceAed'))
    : undefined;
  const minBeds = searchParams.get('minBeds')
    ? Number(searchParams.get('minBeds'))
    : undefined;
  const verifiedOnly = searchParams.get('verifiedOnly') === 'true';
  const requestedUnpublished = searchParams.get('includeUnpublished') === 'true';
  const sessionUser = requestedUnpublished ? await getCurrentSessionUser() : null;
  const includeUnpublished = Boolean(
    requestedUnpublished && sessionUser && canViewDashboard(sessionUser.role)
  );
  const cursor = searchParams.get('cursor') ?? undefined;
  const rawLimit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 24;
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, Math.floor(rawLimit)), 48) : 24;

  const north = searchParams.get('north');
  const south = searchParams.get('south');
  const east = searchParams.get('east');
  const west = searchParams.get('west');
  const bounds =
    north && south && east && west
      ? {
          north: Number(north),
          south: Number(south),
          east: Number(east),
          west: Number(west),
        }
      : undefined;

  const result = listProperties({
    q,
    propertyType,
    status,
    minPriceAed,
    maxPriceAed,
    minBeds,
    verifiedOnly,
    includeUnpublished,
    bounds,
    cursor,
    limit,
  });

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  const user = await getCurrentSessionUser();
  if (!canCreateProperty(user.role)) {
    return apiError(
      403,
      'FORBIDDEN',
      'Only authenticated agents, managers, or admins can create property listings.'
    );
  }

  const rl = checkRateLimit(`prop-create:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return apiError(429, 'RATE_LIMITED', 'Too many property creation requests. Please wait.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }

  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error);
  }

  const property = createProperty(parsed.data, user);
  return NextResponse.json({ property }, { status: 201 });
}
