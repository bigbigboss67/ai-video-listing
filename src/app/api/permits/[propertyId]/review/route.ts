import { NextResponse } from 'next/server';
import { canReviewPermits, getCurrentSessionUser } from '@/lib/auth';
import { apiError, unauthenticatedError, zodApiError } from '@/lib/api-error';
import { PermitReviewError, reviewPermit } from '@/lib/store';
import { permitReviewSchema } from '@/lib/validation';

/** Admin approves or rejects a submitted DLD permit link. Approval shows the verified badge. */
export async function POST(
  request: Request,
  context: { params: Promise<{ propertyId: string }> }
) {
  const user = await getCurrentSessionUser();
  if (!user) return unauthenticatedError();
  if (!canReviewPermits(user.role)) {
    return apiError(403, 'FORBIDDEN', 'Only Admins can approve or reject DLD permits.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'INVALID_JSON', 'Invalid JSON body.');
  }
  const parsed = permitReviewSchema.safeParse(body);
  if (!parsed.success) return zodApiError(parsed.error);

  const { propertyId } = await context.params;
  try {
    const updated = reviewPermit(propertyId, parsed.data.action, user, parsed.data.reason);
    if (!updated) return apiError(404, 'PROPERTY_NOT_FOUND', 'Listing not found.');
    return NextResponse.json({ property: updated });
  } catch (err) {
    if (err instanceof PermitReviewError) return apiError(409, err.code, err.message);
    throw err;
  }
}
