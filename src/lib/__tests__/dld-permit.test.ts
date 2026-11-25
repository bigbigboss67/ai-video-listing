// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
  }),
}));

import { SESSION_COOKIE_NAME, signSessionToken } from '@/lib/auth';
import { getDemoProfile } from '@/lib/demo-accounts';
import { parseDldPermitLink } from '@/lib/dld-permit';
import { createPropertySchema, permitReviewSchema } from '@/lib/validation';
import { getPropertyById, getUserById, listProperties, resetLocalStoreForTests } from '@/lib/store';
import { GET as listPermits } from '@/app/api/permits/route';
import { PUT as submitLink } from '@/app/api/permits/[propertyId]/route';
import { POST as reviewLink } from '@/app/api/permits/[propertyId]/review/route';
import { POST as createProperty } from '@/app/api/properties/route';
import { SEED_PROPERTIES } from '@/lib/seed-data';

const REAL_LINK =
  'https://trakheesi.dubailand.gov.ae/rev/madmoun/listing/validation?khevJujtDig=abc123XYZ';

function signInAs(role: Parameters<typeof getDemoProfile>[0]) {
  const profile = getDemoProfile(role);
  const record = getUserById(profile.id)!;
  jar.set(SESSION_COOKIE_NAME, signSessionToken(record.id, record.sessionVersion));
  return record;
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.20' },
    body: JSON.stringify(body),
  });
}

const params = <T,>(p: T) => ({ params: Promise.resolve(p) });

describe('parseDldPermitLink', () => {
  it('accepts the real Madmoun link format and drops the fragment', () => {
    const r = parseDldPermitLink(`  ${REAL_LINK}#top `);
    expect(r).toEqual({ ok: true, url: REAL_LINK, looksLikeMadmoun: true });
  });

  it('flags, but accepts, other paths on the Trakheesi host for the reviewer', () => {
    const r = parseDldPermitLink('https://trakheesi.dubailand.gov.ae/some/other?x=1');
    expect(r.ok && r.looksLikeMadmoun).toBe(false);
    expect(r.ok).toBe(true);
  });

  it.each([
    ['', 'empty'],
    ['not a link', 'not_url'],
    ['http://trakheesi.dubailand.gov.ae/rev/madmoun/listing/validation?k=1', 'not_https'],
    // The old portal-generated link: wrong host, and it 404s
    ['https://dubailand.gov.ae/en/eservices/trakheesi-verification?permit=7118492031', 'wrong_host'],
    ['https://trakheesi.dubailand.gov.ae.evil.com/rev/madmoun/x?k=1', 'wrong_host'],
    ['https://evil.com/?r=trakheesi.dubailand.gov.ae', 'wrong_host'],
    ['https://user:pw@trakheesi.dubailand.gov.ae/rev/madmoun/x?k=1', 'wrong_host'],
    ['https://trakheesi.dubailand.gov.ae:8443/rev/madmoun/x?k=1', 'wrong_host'],
    ['javascript:alert(1)', 'not_https'],
    ['https://trakheesi.dubailand.gov.ae/', 'no_token'],
    [`https://trakheesi.dubailand.gov.ae/?k=${'a'.repeat(2100)}`, 'too_long'],
  ])('rejects %s (%s)', (input, code) => {
    expect(parseDldPermitLink(input)).toEqual({ ok: false, code });
  });
});

describe('permit validation schemas', () => {
  it('requires a reason to reject', () => {
    expect(permitReviewSchema.safeParse({ action: 'reject' }).success).toBe(false);
    expect(permitReviewSchema.safeParse({ action: 'reject', reason: 'Wrong unit' }).success).toBe(true);
    expect(permitReviewSchema.safeParse({ action: 'approve' }).success).toBe(true);
  });

  it('rejects a non-DLD link on listing creation but allows leaving it blank', () => {
    const base = {
      titleEn: 'Marina view apartment',
      descriptionEn: 'Bright two-bedroom unit with marina view.',
      propertyType: 'apartment',
      price: 2_000_000,
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 1200,
      status: 'ready',
      ownership: 'freehold',
      availability: 'available',
      permitNumber: '7188429011',
      addressEn: 'Dubai Marina',
      community: 'Dubai Marina',
      lat: 25.08,
      lng: 55.14,
    };
    expect(createPropertySchema.safeParse(base).success).toBe(true);
    expect(createPropertySchema.safeParse({ ...base, madmounQrUrl: '' }).success).toBe(true);
    expect(createPropertySchema.safeParse({ ...base, madmounQrUrl: 'https://example.com/qr' }).success).toBe(false);
    expect(createPropertySchema.safeParse({ ...base, madmounQrUrl: REAL_LINK }).success).toBe(true);
  });
});

describe('DLD permit review flow', () => {
  beforeEach(() => {
    jar.clear();
    resetLocalStoreForTests();
  });

  it('no seeded listing is verified or carries a generated QR link', () => {
    for (const p of SEED_PROPERTIES) {
      expect(p.isVerified).toBe(false);
      expect(p.madmounQrUrl).toBe('');
    }
    expect(listProperties({ verifiedOnly: true }).total).toBe(0);
  });

  it('a new listing is not verified even with a permit number and a DLD link', async () => {
    signInAs('verified_agent');
    const res = await createProperty(
      jsonRequest('http://x/api/properties', 'POST', {
        titleEn: 'Marina view apartment',
        descriptionEn: 'Bright two-bedroom unit with marina view.',
        propertyType: 'apartment',
        price: 2_000_000,
        bedrooms: 2,
        bathrooms: 2,
        areaSqft: 1200,
        status: 'ready',
        ownership: 'freehold',
        availability: 'available',
        permitNumber: '7188429011',
        madmounQrUrl: REAL_LINK,
        addressEn: 'Dubai Marina',
        community: 'Dubai Marina',
        lat: 25.08,
        lng: 55.14,
      })
    );
    expect(res.status).toBe(201);
    const { property } = await res.json();
    expect(property.isVerified).toBe(false);
    expect(property.permitStatus).toBe('pending');
    expect(property.madmounQrUrl).toBe(REAL_LINK);
  });

  it('agent submits a link, admin approves, badge turns on; a new link turns it off again', async () => {
    const agent = signInAs('verified_agent');
    const own = SEED_PROPERTIES.find((p) => p.ownerId === agent.id)!;

    const bad = await submitLink(
      jsonRequest('http://x', 'PUT', { madmounQrUrl: 'https://example.com/fake' }),
      params({ propertyId: own.id })
    );
    expect(bad.status).toBe(400);

    const ok = await submitLink(
      jsonRequest('http://x', 'PUT', { madmounQrUrl: REAL_LINK }),
      params({ propertyId: own.id })
    );
    expect(ok.status).toBe(200);
    expect(getPropertyById(own.id)!.permitStatus).toBe('pending');
    expect(getPropertyById(own.id)!.isVerified).toBe(false);

    // The agent cannot approve their own permit
    const selfApprove = await reviewLink(
      jsonRequest('http://x', 'POST', { action: 'approve' }),
      params({ propertyId: own.id })
    );
    expect(selfApprove.status).toBe(403);

    // Agents only see their own listings
    const agentList = await (await listPermits()).json();
    expect(agentList.canReview).toBe(false);
    expect(agentList.rows.every((r: { ownerId: string }) => r.ownerId === agent.id)).toBe(true);

    signInAs('admin');
    const adminList = await (await listPermits()).json();
    expect(adminList.canReview).toBe(true);
    expect(adminList.rows[0].propertyId).toBe(own.id); // pending first

    const approve = await reviewLink(
      jsonRequest('http://x', 'POST', { action: 'approve' }),
      params({ propertyId: own.id })
    );
    expect(approve.status).toBe(200);
    expect(getPropertyById(own.id)!.isVerified).toBe(true);
    expect(getPropertyById(own.id)!.permitStatus).toBe('approved');

    signInAs('verified_agent');
    await submitLink(
      jsonRequest('http://x', 'PUT', {
        madmounQrUrl: 'https://trakheesi.dubailand.gov.ae/rev/madmoun/listing/validation?khevJujtDig=new',
      }),
      params({ propertyId: own.id })
    );
    expect(getPropertyById(own.id)!.isVerified).toBe(false);
    expect(getPropertyById(own.id)!.permitStatus).toBe('pending');
  });

  it('admin rejection needs a reason and keeps the badge off', async () => {
    const agent = signInAs('verified_agent');
    const own = SEED_PROPERTIES.find((p) => p.ownerId === agent.id)!;
    await submitLink(jsonRequest('http://x', 'PUT', { madmounQrUrl: REAL_LINK }), params({ propertyId: own.id }));

    signInAs('admin');
    const noReason = await reviewLink(jsonRequest('http://x', 'POST', { action: 'reject' }), params({ propertyId: own.id }));
    expect(noReason.status).toBe(400);
    const rejected = await reviewLink(
      jsonRequest('http://x', 'POST', { action: 'reject', reason: 'Permit is for another unit' }),
      params({ propertyId: own.id })
    );
    expect(rejected.status).toBe(200);
    const after = getPropertyById(own.id)!;
    expect(after.permitStatus).toBe('rejected');
    expect(after.isVerified).toBe(false);
    expect(after.permitReview?.reason).toBe('Permit is for another unit');
  });

  it("blocks agents from changing another agent's permit link, and managers from approving", async () => {
    const other = SEED_PROPERTIES.find((p) => p.ownerId !== getDemoProfile('agent').id)!;
    signInAs('agent');
    const res = await submitLink(
      jsonRequest('http://x', 'PUT', { madmounQrUrl: REAL_LINK }),
      params({ propertyId: other.id })
    );
    expect(res.status).toBe(403);

    signInAs('manager');
    const mgr = await reviewLink(jsonRequest('http://x', 'POST', { action: 'approve' }), params({ propertyId: other.id }));
    expect(mgr.status).toBe(403);

    jar.clear();
    expect((await listPermits()).status).toBe(401);
  });

  it('cannot approve a listing that has no DLD link', async () => {
    signInAs('admin');
    const res = await reviewLink(
      jsonRequest('http://x', 'POST', { action: 'approve' }),
      params({ propertyId: SEED_PROPERTIES[0].id })
    );
    expect(res.status).toBe(409);
  });
});
