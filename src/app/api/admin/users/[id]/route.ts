import { NextResponse } from 'next/server';
import { canManageUsers, getCurrentSessionUser } from '@/lib/auth';
import { apiError, unauthenticatedError, zodApiError } from '@/lib/api-error';
import { countActiveAdmins, getUserById, updateUserAccess } from '@/lib/store';
import { updateUserAccessSchema } from '@/lib/validation';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentSessionUser();
  if (!actor) return unauthenticatedError();
  if (!canManageUsers(actor.role)) {
    return apiError(403, 'FORBIDDEN', 'Only Admins can manage user accounts.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'INVALID_JSON', 'Invalid JSON body.');
  }

  const parsed = updateUserAccessSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error);
  }

  const { id } = await context.params;
  const target = getUserById(id);
  if (!target) {
    return apiError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  const removesAdmin =
    target.role === 'admin' &&
    !target.disabled &&
    ((parsed.data.role !== undefined && parsed.data.role !== 'admin') ||
      parsed.data.disabled === true);

  if (removesAdmin && target.id === actor.id) {
    return apiError(
      409,
      'SELF_LOCKOUT',
      'You cannot remove your own admin access. Ask another admin to do it.'
    );
  }
  if (removesAdmin && countActiveAdmins() <= 1) {
    return apiError(409, 'LAST_ADMIN', 'At least one active admin account must remain.');
  }

  const updated = updateUserAccess(id, parsed.data, actor);
  return NextResponse.json({ user: updated });
}
