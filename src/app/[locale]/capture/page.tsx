import { listProperties } from '@/lib/store';
import { CaptureStudio } from '@/components/capture/CaptureStudio';

export const dynamic = 'force-dynamic';

export default function CapturePage() {
  const { items } = listProperties({ includeUnpublished: true, limit: 50 });
  return <CaptureStudio initialProperties={items} />;
}
