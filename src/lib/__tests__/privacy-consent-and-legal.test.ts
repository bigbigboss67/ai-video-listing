import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import ar from '../../../messages/ar.json';
import { createEnquirySchema } from '@/lib/validation';
import { LEGAL_DOCUMENTS, getLegalDocument } from '@/content/legal';
import { LEGAL_DOC_SLUGS } from '@/lib/legal';

const baseEnquiry = {
  propertyId: 'prop-001',
  name: 'Layla Haddad',
  email: 'layla@example.com',
  phone: '+971501234567',
  channel: 'form' as const,
  watchTimeSec: 30,
};

describe('Enquiry privacy consent (UAE PDPL)', () => {
  it('rejects an enquiry without privacy consent', () => {
    expect(createEnquirySchema.safeParse(baseEnquiry).success).toBe(false);
  });

  it('rejects privacy consent that is not literally true', () => {
    for (const value of [false, 'true', 1, 'on']) {
      const result = createEnquirySchema.safeParse({ ...baseEnquiry, privacyConsent: value });
      expect(result.success).toBe(false);
    }
  });

  it('returns a readable error message when consent is missing', () => {
    const result = createEnquirySchema.safeParse({ ...baseEnquiry, privacyConsent: false });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['privacyConsent']);
      expect(result.error.issues[0].message).toMatch(/Privacy Notice/);
    }
  });

  it('accepts consent and defaults marketing opt-in to false', () => {
    const result = createEnquirySchema.safeParse({ ...baseEnquiry, privacyConsent: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.marketingOptIn).toBe(false);
    }
  });

  it('defines the consent copy in English and Arabic, with the privacy link tag', () => {
    for (const msgs of [en, ar]) {
      expect(msgs.enquiry.privacyNotice).toBeTruthy();
      expect(msgs.enquiry.consentLabel).toMatch(/<link>.+<\/link>/);
      expect(msgs.enquiry.marketingLabel).toBeTruthy();
      expect(msgs.enquiry.consentRequired).toBeTruthy();
      expect(msgs.legal.draftBanner).toBeTruthy();
      expect(msgs.legal.footerPrivacy).toBeTruthy();
      expect(msgs.legal.footerTerms).toBeTruthy();
      expect(msgs.legal.footerCookies).toBeTruthy();
    }
  });
});

describe('Bilingual legal documents', () => {
  it('registers every legal slug', () => {
    for (const slug of LEGAL_DOC_SLUGS) {
      expect(getLegalDocument(slug)?.slug).toBe(slug);
    }
    expect(getLegalDocument('unknown')).toBeNull();
    expect(getLegalDocument('__proto__')).toBeNull();
  });

  it.each(Object.values(LEGAL_DOCUMENTS))('$slug has matching EN and AR structure', (doc) => {
    expect(doc.en.title).toBeTruthy();
    expect(doc.ar.title).toBeTruthy();
    expect(doc.ar.sections.map((s) => s.id)).toEqual(doc.en.sections.map((s) => s.id));

    doc.en.sections.forEach((enSection, i) => {
      const arSection = doc.ar.sections[i];
      expect(arSection.blocks.map((b) => b.type)).toEqual(enSection.blocks.map((b) => b.type));
      enSection.blocks.forEach((block, bi) => {
        const arBlock = arSection.blocks[bi];
        if (block.type === 'ul' && arBlock.type === 'ul') {
          expect(arBlock.items.length).toBe(block.items.length);
        }
        if (block.type === 'table' && arBlock.type === 'table') {
          expect(arBlock.rows.length).toBe(block.rows.length);
          expect(arBlock.headers.length).toBe(block.headers.length);
        }
      });
    });
  });

  it.each(Object.values(LEGAL_DOCUMENTS))('$slug review notes point at real sections', (doc) => {
    const ids = new Set(doc.en.sections.map((s) => s.id));
    for (const id of Object.keys(doc.review)) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('Arabic text is actually Arabic', () => {
    for (const doc of Object.values(LEGAL_DOCUMENTS)) {
      expect(doc.ar.title).toMatch(/[؀-ۿ]/);
      for (const s of doc.ar.sections) expect(s.heading).toMatch(/[؀-ۿ]/);
    }
  });
});
