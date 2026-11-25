import type { LegalDocSlug } from '@/lib/legal';
import { cookiePolicy } from './cookies';
import { privacyNotice } from './privacy';
import { termsOfUse } from './terms';
import type { LegalDocument } from './types';

export const LEGAL_DOCUMENTS: Record<LegalDocSlug, LegalDocument> = {
  privacy: privacyNotice,
  terms: termsOfUse,
  cookies: cookiePolicy,
};

export function getLegalDocument(slug: string): LegalDocument | null {
  return Object.prototype.hasOwnProperty.call(LEGAL_DOCUMENTS, slug)
    ? LEGAL_DOCUMENTS[slug as LegalDocSlug]
    : null;
}

export type { LegalBlock, LegalDocument, LegalDocLocale, LegalSection } from './types';
