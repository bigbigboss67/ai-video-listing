import { NextResponse } from 'next/server';
import { canCreateProperty, canReviewPermits, getCurrentSessionUser } from '@/lib/auth';
import { apiError, unauthenticatedError } from '@/lib/api-error';
import { listPermitRows } from '@/lib/store';

/** DLD permit review list: Admins see every listing, agents see only their own. */
export async function GET() {
  const user = await getCurrentSessionUser();
  if (!user) return unauthenticatedError();
  const isReviewer = canReviewPermits(user.role);
  if (!isReviewer && !canCreateProperty(user.role)) {
    return apiError(403, 'FORBIDDEN', 'Only agents and Admins can view DLD permit status.');
  }
  return NextResponse.json({
    canReview: isReviewer,
    rows: listPermitRows(user, isReviewer),
  });
}
