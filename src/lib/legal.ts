/**
 * Version stamp for the privacy notice shown at the point of collection.
 * Bump it whenever the privacy notice wording changes, so each stored
 * enquiry records which version the enquirer agreed to.
 */
export const PRIVACY_NOTICE_VERSION = '2026-11-draft-1';

/** Draft status: shown as a banner on every legal page until counsel signs off. */
export const LEGAL_PAGES_PENDING_LAWYER_REVIEW = true;

export const LEGAL_DOC_SLUGS = ['privacy', 'terms', 'cookies'] as const;
export type LegalDocSlug = (typeof LEGAL_DOC_SLUGS)[number];
