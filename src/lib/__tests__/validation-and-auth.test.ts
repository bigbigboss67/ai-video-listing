import { describe, expect, it } from 'vitest';
import {
  createPropertySchema,
  initiateUploadSchema,
} from '@/lib/validation';
import {
  canCreateProperty,
  canModerate,
  canPublishDirectly,
  canUploadVideo,
  canViewAuditLogs,
  signSessionToken,
  verifySessionToken,
} from '@/lib/auth';

describe('UAE Compliance & Input Validation Schemas', () => {
  const validReadyProperty = {
    titleEn: 'Marina Gate Corner Residence',
    descriptionEn: 'Panoramic waterfront 3-bedroom residence in Dubai Marina.',
    propertyType: 'apartment' as const,
    price: 5500000,
    currency: 'AED' as const,
    bedrooms: 3,
    bathrooms: 4,
    areaSqft: 2150,
    status: 'ready' as const,
    ownership: 'freehold' as const,
    availability: 'available' as const,
    permitNumber: '7145029881',
    addressEn: 'Marina Gate Tower 2, Dubai Marina',
    community: 'Dubai Marina',
    lat: 25.0884,
    lng: 55.1462,
  };

  it('accepts valid ready Dubai property with Trakheesi permit', () => {
    const res = createPropertySchema.safeParse(validReadyProperty);
    expect(res.success).toBe(true);
  });

  it('rejects property with missing or malformed Trakheesi permit', () => {
    const res = createPropertySchema.safeParse({
      ...validReadyProperty,
      permitNumber: '123',
    });
    expect(res.success).toBe(false);
  });

  it('enforces developer name and DLD escrow account for off-plan properties', () => {
    const missingEscrow = createPropertySchema.safeParse({
      ...validReadyProperty,
      status: 'off_plan',
    });
    expect(missingEscrow.success).toBe(false);

    const validOffPlan = createPropertySchema.safeParse({
      ...validReadyProperty,
      status: 'off_plan',
      developerName: 'Creekside Developments PJSC',
      escrowAccount: 'AE480260001015849203101',
    });
    expect(validOffPlan.success).toBe(true);
  });

  it('rejects disallowed video MIME types, oversized files, and unattested uploads', () => {
    const badMime = initiateUploadSchema.safeParse({
      propertyId: 'prop-001',
      filename: 'payload.exe',
      mimeType: 'application/x-msdownload',
      sizeBytes: 1024,
      durationSec: 30,
      consentAttested: true,
    });
    expect(badMime.success).toBe(false);

    const oversized = initiateUploadSchema.safeParse({
      propertyId: 'prop-001',
      filename: 'huge.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 300 * 1024 * 1024,
      durationSec: 60,
      consentAttested: true,
    });
    expect(oversized.success).toBe(false);

    const missingConsent = initiateUploadSchema.safeParse({
      propertyId: 'prop-001',
      filename: 'tour.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 5 * 1024 * 1024,
      durationSec: 45,
      consentAttested: false,
    });
    expect(missingConsent.success).toBe(false);
  });
});

describe('Server-Side Session Signing & RBAC Enforcement', () => {
  it('signs and verifies HMAC session tokens and rejects tampering', () => {
    const token = signSessionToken('admin');
    expect(verifySessionToken(token)).toBe('admin');
    expect(verifySessionToken(`${token}tampered`)).toBeNull();
    expect(verifySessionToken('invalid-token')).toBeNull();
  });

  it('enforces least-privilege RBAC across roles', () => {
    expect(canUploadVideo('viewer')).toBe(false);
    expect(canCreateProperty('viewer')).toBe(false);

    expect(canUploadVideo('agent')).toBe(true);
    expect(canPublishDirectly('agent')).toBe(false);
    expect(canModerate('agent')).toBe(false);
    expect(canViewAuditLogs('agent')).toBe(false);

    expect(canPublishDirectly('verified_agent')).toBe(true);
    expect(canModerate('verified_agent')).toBe(false);

    expect(canModerate('manager')).toBe(true);
    expect(canModerate('admin')).toBe(true);
    expect(canViewAuditLogs('admin')).toBe(true);
  });
});
