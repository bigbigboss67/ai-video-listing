// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Cookie jar used by the mocked next/headers cookies() in route handlers
const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
  }),
}));

import { SESSION_COOKIE_NAME, resolveSessionUser, signSessionToken } from '@/lib/auth';
import { DEFAULT_DEMO_PASSWORD } from '@/lib/demo-accounts';
import { hashPassword, verifyPassword } from '@/lib/password';
import { getUserById, resetLocalStoreForTests, updateUserAccess } from '@/lib/store';
import { getDemoProfile } from '@/lib/demo-accounts';
import * as sessionRoute from '@/app/api/auth/session/route';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as exportMe, DELETE as eraseMe } from '@/app/api/account/me/route';
import { GET as dashboard } from '@/app/api/dashboard/route';
import { POST as createProperty } from '@/app/api/properties/route';
import { POST as moderate } from '@/app/api/videos/[id]/moderate/route';
import { GET as listUsers, POST as createUser } from '@/app/api/admin/users/route';
import { PATCH as patchUser } from '@/app/api/admin/users/[id]/route';

function signInAs(role: Parameters<typeof getDemoProfile>[0]) {
  const profile = getDemoProfile(role);
  const record = getUserById(profile.id)!;
  jar.set(SESSION_COOKIE_NAME, signSessionToken(record.id, record.sessionVersion));
  return record;
}

function jsonRequest(url: string, method: string, body: unknown, ip = '203.0.113.10') {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

const params = <T,>(p: T) => ({ params: Promise.resolve(p) });

describe('Password hashing', () => {
  it('verifies the right password and rejects the wrong one', () => {
    const hash = hashPassword('correct horse battery');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('correct horse battery', hash)).toBe(true);
    expect(verifyPassword('wrong password', hash)).toBe(false);
    expect(verifyPassword('anything', 'not-a-hash')).toBe(false);
  });
});

describe('Authentication & authorization regression (review findings)', () => {
  beforeEach(() => {
    jar.clear();
    resetLocalStoreForTests();
  });

  it('no longer lets a client pick its own role via /api/auth/session', () => {
    expect('POST' in sessionRoute).toBe(false);
  });

  it('treats visitors without a session as guests, not verified agents', async () => {
    const res = await sessionRoute.GET();
    expect((await res.json()).user).toBeNull();

    expect((await dashboard()).status).toBe(401);
    const create = await createProperty(jsonRequest('http://x/api/properties', 'POST', {}));
    expect(create.status).toBe(401);
    const mod = await moderate(
      jsonRequest('http://x/api/videos/v/moderate', 'POST', { action: 'approve' }),
      params({ id: 'vid-001' })
    );
    expect(mod.status).toBe(401);
  });

  it('requires sign-in for PDPL export and erasure', async () => {
    expect((await exportMe()).status).toBe(401);
    expect((await eraseMe()).status).toBe(401);

    signInAs('viewer');
    const res = await exportMe();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile.id).toBe('usr-viewer-01');
    expect(body.profile.passwordHash).toBeUndefined();
  });

  it('logs in with valid credentials only and never leaks the password hash', async () => {
    const bad = await login(
      jsonRequest('http://x/api/auth/login', 'POST', {
        email: 'tariq@makanreel.ae',
        password: 'wrong-password',
      })
    );
    expect(bad.status).toBe(401);
    expect(bad.headers.get('set-cookie')).toBeNull();

    const unknown = await login(
      jsonRequest('http://x/api/auth/login', 'POST', {
        email: 'nobody@example.com',
        password: 'whatever-password',
      })
    );
    expect(unknown.status).toBe(401);
    expect((await unknown.json()).error.code).toBe((await bad.json()).error.code);

    const ok = await login(
      jsonRequest('http://x/api/auth/login', 'POST', {
        email: 'Tariq@MakanReel.ae',
        password: DEFAULT_DEMO_PASSWORD,
      })
    );
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body.user.role).toBe('admin');
    expect(body.user.passwordHash).toBeUndefined();
    const cookie = ok.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookie.toLowerCase()).toContain('httponly');
  });

  it('rate-limits repeated failed logins for one account', async () => {
    let last = 0;
    for (let i = 0; i < 9; i++) {
      const res = await login(
        jsonRequest(
          'http://x/api/auth/login',
          'POST',
          { email: 'omar@makanreel.ae', password: `guess-${i}` },
          `198.51.100.${i}`
        )
      );
      last = res.status;
    }
    expect(last).toBe(429);
  });

  it('reads the role from the server-side user record, not the cookie', async () => {
    const agent = signInAs('agent');
    const token = jar.get(SESSION_COOKIE_NAME);
    expect(resolveSessionUser(token)?.role).toBe('agent');

    // Disabling the account revokes the existing cookie immediately
    updateUserAccess(agent.id, { disabled: true }, getDemoProfile('admin'));
    expect(resolveSessionUser(token)).toBeNull();
  });

  it('restricts user management to admins and prevents last-admin lockout', async () => {
    signInAs('manager');
    expect((await listUsers()).status).toBe(403);

    const admin = signInAs('admin');
    const list = await listUsers();
    expect(list.status).toBe(200);
    const { users } = await list.json();
    expect(users.every((u: Record<string, unknown>) => !('passwordHash' in u))).toBe(true);

    const created = await createUser(
      jsonRequest('http://x/api/admin/users', 'POST', {
        email: 'new.agent@example.com',
        password: 'a-strong-password',
        fullName: 'New Agent',
        role: 'agent',
      })
    );
    expect(created.status).toBe(201);

    // Mass-assignment guard: unknown fields are rejected
    const sneaky = await createUser(
      jsonRequest('http://x/api/admin/users', 'POST', {
        email: 'x@example.com',
        password: 'a-strong-password',
        fullName: 'X',
        role: 'agent',
        sessionVersion: 99,
      })
    );
    expect(sneaky.status).toBe(400);

    const selfDemote = await patchUser(
      jsonRequest(`http://x/api/admin/users/${admin.id}`, 'PATCH', { role: 'viewer' }),
      params({ id: admin.id })
    );
    expect(selfDemote.status).toBe(409);

    const promote = await patchUser(
      jsonRequest('http://x/api/admin/users/usr-agent-s1', 'PATCH', { role: 'verified_agent' }),
      params({ id: 'usr-agent-s1' })
    );
    expect(promote.status).toBe(200);
    expect((await promote.json()).user.role).toBe('verified_agent');
  });
});
