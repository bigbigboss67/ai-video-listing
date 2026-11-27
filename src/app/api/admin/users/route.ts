import { NextResponse } from 'next/server';
import { canManageUsers, getCurrentSessionUser } from '@/lib/auth';
import { apiError, unauthenticatedError, zodApiError } from '@/lib/api-error';
import { createUserAccount, listUsers } from '@/lib/store';
import { createUserSchema } from '@/lib/validation';

export async function GET() {
  const actor = await getCurrentSessionUser();
  if (!actor) return unauthenticatedError();
  if (!canManageUsers(actor.role)) {
    return apiError(403, 'FORBIDDEN', 'Only Admins can manage user accounts.');
  }
  return NextResponse.json({ users: listUsers() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
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

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error);
  }

  const result = createUserAccount(parsed.data, actor);
  if (!result.ok) {
    return apiError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
  }
  return NextResponse.json({ user: result.user }, { status: 201 });
}
