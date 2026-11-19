import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  getCurrentSessionUser,
  getDemoUser,
  signSessionToken,
} from '@/lib/auth';
import { switchRoleSchema } from '@/lib/validation';
import { zodApiError } from '@/lib/api-error';

export async function GET() {
  const user = await getCurrentSessionUser();
  return NextResponse.json({ user });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Invalid JSON body', requestId: 'req-json' } },
      { status: 400 }
    );
  }

  const parsed = switchRoleSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error);
  }

  const token = signSessionToken(parsed.data.role);
  const user = getDemoUser(parsed.data.role);

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
