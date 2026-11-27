import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { canUploadVideo, getCurrentSessionUser } from '@/lib/auth';
import { listProperties } from '@/lib/store';
import { CaptureStudio } from '@/components/capture/CaptureStudio';
import { EmptyState } from '@/components/ui/Primitives';

export const dynamic = 'force-dynamic';

export default async function CapturePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentSessionUser();
  if (!user) {
    redirect({ href: '/login?next=%2Fcapture', locale });
    return null;
  }
  if (!canUploadVideo(user.role)) {
    const t = await getTranslations({ locale, namespace: 'auth' });
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <EmptyState title={t('forbiddenTitle')} description={t('forbiddenCaptureBody')} />
      </div>
    );
  }
  // Unpublished drafts are only listed once the server has confirmed an agent role
  const { items } = listProperties({ includeUnpublished: true, limit: 50 });
  return <CaptureStudio initialProperties={items} />;
}
