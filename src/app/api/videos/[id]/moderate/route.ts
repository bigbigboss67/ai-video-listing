import { NextResponse } from 'next/server';
import { canModerate, getCurrentSessionUser } from '@/lib/auth';
import { apiError, unauthenticatedError, zodApiError } from '@/lib/api-error';
import { moderateVideo } from '@/lib/store';
import { moderationActionSchema } from '@/lib/validation';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentSessionUser();
  if (!user) return unauthenticatedError();
  if (!canModerate(user.role)) {
    return apiError(
      403,
      'FORBIDDEN',
      'Only Admins and Managers can approve, reject, or retry moderated videos.'
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'INVALID_JSON', 'Invalid JSON body.');
  }

  const parsed = moderationActionSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error);
  }

  const { id } = await context.params;
  const updated = moderateVideo(id, parsed.data.action, user, parsed.data.reason);
  if (!updated) {
    return apiError(404, 'VIDEO_NOT_FOUND', `Video "${id}" was not found.`);
  }

  return NextResponse.json({ video: updated });
}
