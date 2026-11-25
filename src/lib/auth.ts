import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { SessionUser, UserRole } from '@/types/domain';
import { getUserById, toSessionUser } from './store';

export const SESSION_COOKIE_NAME = 'makanreel_session';
export const SESSION_TTL_SEC = 60 * 60 * 12; // 12 hours

const DEV_FALLBACK_SECRET = 'makanreel-local-dev-ephemeral-signing-key-do-not-use-in-prod';
const PLACEHOLDER_SECRET = 'replace-with-32-byte-random-secret-in-production';

/**
 * Returns the cookie-signing secret, or null when sessions cannot be issued safely.
 * In production a real SESSION_SECRET (32+ chars, not the example placeholder) is required;
 * without one, nobody can sign in and every request is treated as a guest (fail closed).
 */
export function getSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32 && secret !== PLACEHOLDER_SECRET) return secret;
  if (process.env.NODE_ENV === 'production') return null;
  return DEV_FALLBACK_SECRET;
}

export interface SessionClaims {
  uid: string;
  sv: number;
  iat: number;
  exp: number;
}

function hmac(secret: string, data: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

export function signSessionToken(
  userId: string,
  sessionVersion: number,
  nowMs = Date.now()
): string {
  const secret = getSessionSecret();
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const iat = Math.floor(nowMs / 1000);
  const claims: SessionClaims = { uid: userId, sv: sessionVersion, iat, exp: iat + SESSION_TTL_SEC };
  const encoded = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  return `${encoded}.${hmac(secret, encoded)}`;
}

export function verifySessionToken(
  token: string | undefined,
  nowMs = Date.now()
): SessionClaims | null {
  const secret = getSessionSecret();
  if (!secret || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [encoded, sig] = parts;
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(hmac(secret, encoded));
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<SessionClaims>;
    if (
      typeof parsed.uid !== 'string' ||
      typeof parsed.sv !== 'number' ||
      typeof parsed.iat !== 'number' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (Math.floor(nowMs / 1000) >= parsed.exp) return null;
    return parsed as SessionClaims;
  } catch {
    return null;
  }
}

/**
 * Resolve a session token to the live user record. The role always comes from the
 * user store, never from the cookie, so role changes and account disabling apply
 * on the next request.
 */
export function resolveSessionUser(token: string | undefined): SessionUser | null {
  const claims = verifySessionToken(token);
  if (!claims) return null;
  const record = getUserById(claims.uid);
  if (!record || record.disabled || record.sessionVersion !== claims.sv) return null;
  return toSessionUser(record);
}

/** The signed-in user, or null for guests. */
export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  return resolveSessionUser(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_SEC,
};

/** Only allow same-site relative redirect targets (blocks //evil.com and absolute URLs). */
export function safeRedirectPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return fallback;
  }
  return raw;
}

// Strict Server-Side RBAC Policy Functions
export function canCreateProperty(role: UserRole): boolean {
  return ['admin', 'manager', 'verified_agent', 'agent'].includes(role);
}

export function canUploadVideo(role: UserRole): boolean {
  return ['admin', 'manager', 'verified_agent', 'agent'].includes(role);
}

export function canPublishDirectly(role: UserRole): boolean {
  return ['admin', 'manager', 'verified_agent'].includes(role);
}

export function canModerate(role: UserRole): boolean {
  return ['admin', 'manager'].includes(role);
}

export function canViewDashboard(role: UserRole): boolean {
  return ['admin', 'manager', 'verified_agent', 'agent'].includes(role);
}

export function canViewAuditLogs(role: UserRole): boolean {
  return ['admin', 'manager'].includes(role);
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin';
}

/** Approving a DLD permit link turns on the public "verified" badge, so only Admins may do it. */
export function canReviewPermits(role: UserRole): boolean {
  return role === 'admin';
}
