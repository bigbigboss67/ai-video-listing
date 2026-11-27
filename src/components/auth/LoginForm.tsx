'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LogIn } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useAppContext } from '@/components/providers/AppProvider';
import { Button } from '@/components/ui/Primitives';

const inputClass =
  'w-full h-11 px-3 rounded-[6px] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--accent-primary)]';

export function LoginForm({
  nextPath,
  showDemoHint,
}: {
  nextPath: string;
  showDemoHint: boolean;
}) {
  const t = useTranslations('auth');
  const router = useRouter();
  const { signIn } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn(email, password);
      if (result.ok) {
        router.replace(nextPath);
        router.refresh();
        return;
      }
      setError(
        result.status === 429
          ? t('errorRateLimited')
          : result.status === 503
            ? t('errorUnavailable')
            : t('errorInvalid')
      );
    } catch {
      setError(t('errorNetwork'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{t('subtitle')}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold mb-1.5">
            {t('email')}
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            dir="ltr"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-xs font-semibold mb-1.5">
            {t('password')}
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            dir="ltr"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-[var(--status-danger)]">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="accent"
          size="lg"
          className="w-full"
          disabled={submitting || !email || !password}
        >
          <LogIn className="w-4 h-4" />
          {submitting ? t('submitting') : t('submit')}
        </Button>
      </form>

      {showDemoHint ? (
        <p className="mt-6 text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-4">
          {t('demoHint')}
        </p>
      ) : null}
    </div>
  );
}
