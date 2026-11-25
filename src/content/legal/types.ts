import type { LegalDocSlug } from '@/lib/legal';

/**
 * Legal page content model.
 *
 * Text conventions:
 *  - Anything in square brackets, e.g. "[COMPANY LEGAL NAME]", is a placeholder
 *    or an unconfirmed guess. The page renders it highlighted so it cannot be
 *    missed before launch.
 *  - `review` notes are internal drafting notes for the reviewing UAE lawyer.
 *    They are shared by both languages (written in English) and must be
 *    removed once the text is approved.
 */
export type LegalBlock =
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface LegalSection {
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocLocale {
  title: string;
  summary: string;
  sections: LegalSection[];
}

export interface LegalDocument {
  slug: LegalDocSlug;
  version: string;
  lastUpdated: string; // ISO date
  /** Section id -> drafting note for the reviewing lawyer. */
  review: Record<string, string>;
  en: LegalDocLocale;
  ar: LegalDocLocale;
}
