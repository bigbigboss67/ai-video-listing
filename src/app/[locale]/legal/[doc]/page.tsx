import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLegalDocument } from '@/content/legal';
import { LegalDocumentView } from '@/components/legal/LegalDocumentView';

type Params = Promise<{ locale: string; doc: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, doc } = await params;
  const legalDoc = getLegalDocument(doc);
  if (!legalDoc) return {};
  const content = locale === 'ar' ? legalDoc.ar : legalDoc.en;
  return {
    title: `${content.title} — MakanReel`,
    description: content.summary,
    // Drafts must not be indexed until counsel approves them.
    robots: { index: false, follow: true },
  };
}

export default async function LegalPage({ params }: { params: Params }) {
  const { locale, doc } = await params;
  const legalDoc = getLegalDocument(doc);
  if (!legalDoc) {
    notFound();
  }
  return <LegalDocumentView document={legalDoc} locale={locale === 'ar' ? 'ar' : 'en'} />;
}
