import { NextResponse } from 'next/server';
import { canCreateProperty, canReviewPermits, getCurrentSessionUser } from '@/lib/auth';
import { apiError, checkRateLimit, unauthenticatedError, zodApiError } from '@/lib/api-error';
import { getPropertyById, PermitReviewError, submitPermitLink } from '@/lib/store';
import { submitPermitLinkSchema } from '@/lib/validation';

/** Agent submits (or replaces) the link from their DLD Madmoun QR. Sends the listing to admin review. */
export async function PUT(
  request: Request,
  context: { params: Promise<{ propertyId: string }> }
) {
  const user = await getCurrentSessionUser();
  if (!user) return unauthenticatedError();
  if (!canCreateProperty(user.role)) {
    return apiError(403, 'FORBIDDEN', 'Only agents and Admins can submit DLD permit links.');
  }

  const limit = checkRateLimit(`permit-submit:${user.id}`, 20, 60_000);
  if (!limit.allowed) {
    return apiError(429, 'RATE_LIMITED', 'Too many permit link changes. Try again in a minute.');
  }

  const { propertyId } = await context.params;
  const property = getPropertyById(propertyId);
  if (!property) return apiError(404, 'PROPERTY_NOT_FOUND', 'Listing not found.');
  if (property.ownerId !== user.id && !canReviewPermits(user.role)) {
    return apiError(403, 'FORBIDDEN', 'You can only submit permit links for your own listings.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'INVALID_JSON', 'Invalid JSON body.');
  }
  const parsed = submitPermitLinkSchema.safeParse(body);
  if (!parsed.success) return zodApiError(parsed.error);

  try {
    const updated = submitPermitLink(propertyId, parsed.data.madmounQrUrl, user);
    if (!updated) return apiError(404, 'PROPERTY_NOT_FOUND', 'Listing not found.');
    return NextResponse.json({ property: updated });
  } catch (err) {
    if (err instanceof PermitReviewError) return apiError(400, err.code, err.message);
    throw err;
  }
}
