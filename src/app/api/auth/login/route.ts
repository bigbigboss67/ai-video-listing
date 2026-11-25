import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  getSessionSecret,
  sessionCookieOptions,
  signSessionToken,
} from '@/lib/auth';
import { apiError, checkRateLimit, zodApiError } from '@/lib/api-error';
import { getClientIpFromHeaders } from '@/lib/anti-scraper';
import { burnPasswordCheck, verifyPassword } from '@/lib/password';
import { appendAuditLog, findUserByEmail, recordUserLogin, toSessionUser } from '@/lib/store';
import { loginSchema } from '@/lib/validation';

export async function POST(request: Request) {
  if (!getSessionSecret()) {
    return apiError(
      503,
      'AUTH_NOT_CONFIGURED',
      'Sign-in is unavailable: SESSION_SECRET is not configured on the server.'
    );
  }

  const ip = getClientIpFromHeaders(request.headers);
  const ipLimit = checkRateLimit(`login-ip:${ip}`, 10, 60_000);
  if (!ipLimit.allowed) {
    return apiError(429, 'RATE_LIMITED', 'Too many sign-in attempts. Please wait a minute.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'INVALID_JSON', 'Invalid JSON body.');
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error);
  }

  const { email, password } = parsed.data;
  const emailLimit = checkRateLimit(`login-email:${email}`, 8, 15 * 60_000);
  if (!emailLimit.allowed) {
    return apiError(
      429,
      'RATE_LIMITED',
      'Too many sign-in attempts for this account. Try again in 15 minutes.'
    );
  }

  const record = findUserByEmail(email);
  let valid = false;
  if (record) {
    valid = verifyPassword(password, record.passwordHash);
  } else {
    burnPasswordCheck(password);
  }

  if (!record || !valid || record.disabled) {
    // Same message for unknown email, wrong password and disabled account
    return apiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  recordUserLogin(record.id);
  const user = toSessionUser(record);
  appendAuditLog({
    actor: user,
    action: 'auth.login.succeeded',
    entityType: 'user_account',
    entityId: user.id,
    metadata: {},
  });

  const response = NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    signSessionToken(record.id, record.sessionVersion),
    sessionCookieOptions
  );
  return response;
}
