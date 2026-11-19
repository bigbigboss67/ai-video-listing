import { listProperties } from '@/lib/store';
import { VerticalReelsFeed } from '@/components/reels/VerticalReelsFeed';

export const dynamic = 'force-dynamic';

export default function ReelsPage() {
  const { items } = listProperties({ limit: 30 });
  return <VerticalReelsFeed properties={items} />;
}
