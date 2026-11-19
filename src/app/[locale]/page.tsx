import { listProperties } from '@/lib/store';
import { DiscoveryPortal } from '@/components/portal/DiscoveryPortal';

export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const { items } = listProperties({ limit: 30 });
  const initialView =
    view === 'map' || view === 'grid' || view === 'split' ? view : 'split';

  return (
    <DiscoveryPortal initialProperties={items} initialView={initialView} />
  );
}
