import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { SessionUser, UserRole } from '@/types/domain';

export const SESSION_COOKIE_NAME = 'makanreel_session';

const DEMO_USERS: Record<UserRole, SessionUser> = {
  admin: {
    id: 'usr-admin-01',
    role: 'admin',
    fullName: 'Tariq Al-Mansoori',
    email: 'tariq@makanreel.ae',
    orgName: 'MakanReel Compliance & Ops',
    orn: 'ORN-29410',
    brn: 'BRN-44102',
    whatsappNumber: '+971501112233',
    locale: 'en',
  },
  manager: {
    id: 'usr-mgr-01',
    role: 'manager',
    fullName: 'Nadia Haddad',
    email: 'nadia@makanreel.ae',
    orgName: 'MakanReel Advisory Dubai',
    orn: 'ORN-29410',
    brn: 'BRN-51208',
    whatsappNumber: '+971502223344',
    locale: 'en',
  },
  verified_agent: {
    id: 'usr-agent-v1',
    role: 'verified_agent',
    fullName: 'Layla Al-Rashid',
    email: 'layla@makanreel.ae',
    orgName: 'MakanReel Advisory Dubai',
    orn: 'ORN-29410',
    brn: 'BRN-58914',
    whatsappNumber: '+971504445566',
    locale: 'en',
  },
  agent: {
    id: 'usr-agent-s1',
    role: 'agent',
    fullName: 'Omar Khoury',
    email: 'omar@makanreel.ae',
    orgName: 'Gulf Prime Properties',
    orn: 'ORN-31820',
    brn: 'BRN-62190',
    whatsappNumber: '+971507778899',
    locale: 'en',
  },
  viewer: {
    id: 'usr-viewer-01',
    role: 'viewer',
    fullName: 'Elena Rostova (Investor)',
    email: 'elena.investor@example.com',
    locale: 'en',
  },
};

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    'makanreel-local-dev-ephemeral-signing-key-do-not-use-in-prod'
  );
}

export function signSessionToken(role: UserRole): string {
  const payload = JSON.stringify({ role, iat: Date.now() });
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined): UserRole | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expected = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as { role?: UserRole };
    if (parsed.role && parsed.role in DEMO_USERS) {
      return parsed.role;
    }
    return null;
  } catch {
    return null;
  }
}

export function getDemoUser(role: UserRole): SessionUser {
  return DEMO_USERS[role];
}

export async function getCurrentSessionUser(): Promise<SessionUser> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const verifiedRole = verifySessionToken(raw);
  // Default to verified_agent in zero-key local mode so mobile capture & live sync work immediately
  return DEMO_USERS[verifiedRole ?? 'verified_agent'];
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
