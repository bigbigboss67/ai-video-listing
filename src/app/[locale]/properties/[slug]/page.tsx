import { notFound } from 'next/navigation';
import { getPropertyBySlug } from '@/lib/store';
import { PropertyDetailView } from '@/components/detail/PropertyDetailView';

export const dynamic = 'force-dynamic';

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);
  if (!property) {
    notFound();
  }

  return <PropertyDetailView property={property} />;
}
