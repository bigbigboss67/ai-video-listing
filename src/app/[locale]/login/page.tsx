import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getCurrentSessionUser, safeRedirectPath } from '@/lib/auth';
import { LoginForm } from '@/components/auth/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeRedirectPath(next, '/dashboard');
  const user = await getCurrentSessionUser();
  if (user) {
    const locale = await getLocale();
    redirect({ href: nextPath, locale });
  }
  return (
    <LoginForm
      nextPath={nextPath}
      showDemoHint={process.env.NODE_ENV !== 'production'}
    />
  );
}
