import { beforeEach, describe, expect, it } from 'vitest';
import {
  createProperty,
  createVideoUploadSession,
  finalizeVideoProcessing,
  listProperties,
  moderateVideo,
  resetLocalStoreForTests,
} from '@/lib/store';
import {
  BrokerDetailsMissingError,
  getMissingBrokerFields,
} from '@/lib/broker';
import type { SessionUser } from '@/types/domain';
import type { CreatePropertyInput } from '@/lib/validation';

const agentWithBroker: SessionUser = {
  id: 'usr-test-agent',
  role: 'verified_agent',
  fullName: 'Test Agent',
  email: 'agent@example.com',
  orgName: 'Example Realty LLC',
  orn: 'ORN-11111',
  brn: 'BRN-22222',
  whatsappNumber: '+971 50 000 0000',
  locale: 'en',
};

const admin: SessionUser = { ...agentWithBroker, id: 'usr-test-admin', role: 'admin' };

const input: CreatePropertyInput = {
  titleEn: 'Test Listing Without Financials',
  titleAr: '',
  descriptionEn: 'A real description supplied by the agent for this listing.',
  descriptionAr: '',
  propertyType: 'apartment',
  price: 1_500_000,
  currency: 'AED',
  bedrooms: 1,
  bathrooms: 1,
  areaSqft: 800,
  status: 'ready',
  ownership: 'freehold',
  availability: 'available',
  permitNumber: 'PERMIT123456',
  addressEn: 'Test Street, Dubai',
  addressAr: '',
  community: 'Dubai Marina',
  lat: 25.08,
  lng: 55.14,
};

describe('Broker details and no fabricated listing data', () => {
  beforeEach(() => {
    resetLocalStoreForTests();
  });

  it('leaves yield, service charge and payment plan blank when the agent omits them', () => {
    const prop = createProperty(input, agentWithBroker);
    expect(prop.estNetYieldPct).toBeUndefined();
    expect(prop.serviceChargeAedSqft).toBeUndefined();
    expect(prop.paymentPlan).toBeUndefined();
  });

  it("uses the agent's own broker details, never the platform's", () => {
    const prop = createProperty(input, agentWithBroker);
    expect(prop.agentOrg).toBe('Example Realty LLC');
    expect(prop.agentOrn).toBe('ORN-11111');
    expect(prop.agentBrn).toBe('BRN-22222');
    expect(prop.agentWhatsapp).toBe('+971 50 000 0000');
  });

  it('refuses to create a listing when ORN, BRN or WhatsApp is missing', () => {
    const incomplete: SessionUser = {
      ...agentWithBroker,
      orn: undefined,
      brn: '  ',
      whatsappNumber: '123',
    };
    expect(getMissingBrokerFields(incomplete)).toEqual(['orn', 'brn', 'whatsappNumber']);
    expect(() => createProperty(input, incomplete)).toThrow(BrokerDetailsMissingError);
    const titles = listProperties({ includeUnpublished: true }).items.map((p) => p.titleEn);
    expect(titles).not.toContain(input.titleEn);
  });

  function stripBrokerDetails(propertyId: string) {
    // Mimic a legacy record that predates the requirement by editing the in-memory store.
    const db = (globalThis as unknown as {
      __makanreelDb: { properties: Array<{ id: string; agentOrn: string; agentWhatsapp: string }> };
    }).__makanreelDb;
    const record = db.properties.find((p) => p.id === propertyId)!;
    record.agentOrn = '';
    record.agentWhatsapp = '';
  }

  function startUpload(propertyId: string) {
    const session = createVideoUploadSession({
      propertyId,
      actor: agentWithBroker,
      filename: 'walkthrough.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
      durationSec: 30,
    });
    expect(session).not.toBeNull();
    return session!.video.id;
  }

  it('publishes directly when broker details are complete', () => {
    const prop = createProperty(input, agentWithBroker);
    const videoId = startUpload(prop.id);
    expect(finalizeVideoProcessing(videoId, admin, true)?.uploadStatus).toBe('ready');
    expect(listProperties().items.some((p) => p.id === prop.id)).toBe(true);
  });

  it('keeps legacy listings without broker details out of public discovery and blocks approval', () => {
    const prop = createProperty(input, agentWithBroker);
    stripBrokerDetails(prop.id);

    expect(listProperties().items.some((p) => p.id === prop.id)).toBe(false);
    expect(
      listProperties({ includeUnpublished: true }).items.some((p) => p.id === prop.id)
    ).toBe(true);

    const videoId = startUpload(prop.id);
    // Direct publish is downgraded to moderation...
    expect(finalizeVideoProcessing(videoId, admin, true)?.uploadStatus).toBe('in_review');
    // ...and moderators cannot approve it until the details are added.
    expect(() => moderateVideo(videoId, 'approve', admin)).toThrow(BrokerDetailsMissingError);
    // Rejecting is still allowed.
    expect(moderateVideo(videoId, 'reject', admin, 'Missing broker details')?.moderationStatus).toBe(
      'rejected'
    );
  });
});
