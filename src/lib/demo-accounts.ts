import type { SessionUser, UserRole } from '@/types/domain';

/**
 * Demo account profiles. They are only seeded as real login accounts when
 * NODE_ENV !== 'production' (see seedUsers in store.ts). Their IDs match the
 * owner/uploader IDs used in seed-data.ts.
 */
export const DEMO_PROFILES: Record<UserRole, SessionUser> = {
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

/** Default local-dev password for demo accounts; override with DEMO_ACCOUNT_PASSWORD. */
export const DEFAULT_DEMO_PASSWORD = 'makanreel-demo-2026';

export function getDemoProfile(role: UserRole): SessionUser {
  return DEMO_PROFILES[role];
}

/** Non-human actor used for audit entries written by verified webhooks. */
export const SYSTEM_WEBHOOK_ACTOR: SessionUser = {
  id: 'system-cloudflare-stream',
  role: 'admin',
  fullName: 'Cloudflare Stream Webhook (system)',
  email: 'system@makanreel.invalid',
  locale: 'en',
};
