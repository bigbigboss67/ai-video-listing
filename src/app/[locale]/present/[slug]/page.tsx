import { notFound } from 'next/navigation';
import { getPropertyBySlug } from '@/lib/store';
import { PresentationView } from '@/components/presentation/PresentationView';

export const dynamic = 'force-dynamic';

export default async function PresentationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);
  if (!property) {
    notFound();
  }

  return <PresentationView property={property} />;
}
