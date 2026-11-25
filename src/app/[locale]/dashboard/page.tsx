import { redirect } from '@/i18n/navigation';
import { getCurrentSessionUser } from '@/lib/auth';
import { DashboardView } from '@/components/dashboard/DashboardView';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentSessionUser();
  if (!user) {
    redirect({ href: '/login?next=%2Fdashboard', locale });
    return null;
  }
  // Role checks are enforced by /api/dashboard; the view renders the 403 state itself
  return <DashboardView />;
}
