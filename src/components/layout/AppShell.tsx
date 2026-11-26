'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import {
  Compass,
  Film,
  Globe,
  LayoutDashboard,
  MapPin,
  Moon,
  PlusCircle,
  Radio,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useAppContext } from '@/components/providers/AppProvider';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import type { CurrencyCode, UserRole } from '@/types/domain';

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme, currency, setCurrency, user, switchRole } =
    useAppContext();
  const { connectionState } = useRealtimeSync();

  const isPresentation = pathname.includes('/present/');
  if (isPresentation) {
    return <>{children}</>;
  }

  const nextLocale = locale === 'en' ? 'ar' : 'en';

  const handleLocaleSwitch = () => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Top Desktop & Mobile Header */}
      <header className="sticky top-0 z-40 h-16 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-sm">
        <div className="h-full max-w-[1600px] mx-auto px-3 sm:px-5 flex items-center justify-between gap-3">
          {/* Brand + Live Indicator */}
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 focus-visible:outline-2"
            >
              <span className="w-8 h-8 rounded-[6px] bg-[#12151A] border border-[#D4AF6A]/60 flex items-center justify-center shrink-0">
                <span className="w-2.5 h-2.5 bg-[#D4AF6A] rotate-45" />
              </span>
              <div className="leading-none">
                <span className="block text-sm font-bold tracking-tight text-[var(--text-primary)]">
                  {t('brand.name')}
                </span>
                <span className="hidden sm:block text-[11px] text-[var(--text-muted)] mt-0.5">
                  {t('brand.tagline')}
                </span>
              </div>
            </Link>

            <span
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[11px] font-medium text-[var(--text-secondary)]"
              aria-live="polite"
            >
              <Radio
                className={
                  connectionState === 'connected'
                    ? 'w-3 h-3 text-[var(--status-live)]'
                    : 'w-3 h-3 text-[var(--status-warn)]'
                }
              />
              {connectionState === 'connected'
                ? t('nav.liveConnected')
                : t('nav.liveReconnecting')}
            </span>
          </div>

          {/* Primary Desktop Navigation */}
          <nav
            aria-label="Primary"
            className="hidden lg:flex items-center gap-1 text-sm"
          >
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-[6px] font-medium transition-colors ${
                pathname === '/'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('nav.explore')}
            </Link>
            <Link
              href="/ai-studio"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] font-medium transition-colors ${
                pathname.startsWith('/ai-studio')
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              {t('nav.aiStudio')}
            </Link>
            <Link
              href="/reels"
              className={`px-3 py-1.5 rounded-[6px] font-medium transition-colors ${
                pathname.startsWith('/reels')
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('nav.reels')}
            </Link>
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-[6px] font-medium transition-colors ${
                pathname.startsWith('/dashboard')
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('nav.dashboard')}
            </Link>
          </nav>

          {/* Actions Cluster */}
          <div className="flex items-center gap-2">
            {/* Primary Obvious Action: Record / Upload */}
            <Link
              href="/capture"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[6px] bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-semibold transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('nav.record')}</span>
            </Link>

            {/* Currency selector */}
            <select
              aria-label={t('filters.currency')}
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
            >
              <option value="AED">AED</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>

            {/* Session Role Switcher (Server-signed cookie) */}
            <select
              aria-label={t('roles.switchRole')}
              value={user?.role ?? 'verified_agent'}
              onChange={(e) => switchRole(e.target.value as UserRole)}
              className="hidden md:block h-9 px-2 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] cursor-pointer"
            >
              <option value="verified_agent">{t('roles.verified_agent')}</option>
              <option value="agent">{t('roles.agent')}</option>
              <option value="manager">{t('roles.manager')}</option>
              <option value="admin">{t('roles.admin')}</option>
              <option value="viewer">{t('roles.viewer')}</option>
            </select>

            {/* Locale EN / AR Toggle */}
            <button
              type="button"
              onClick={handleLocaleSwitch}
              aria-label="Switch language"
              className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-xs font-semibold cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>{locale === 'en' ? 'العربية' : 'EN'}</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Enable dark mode' : 'Enable light mode'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] cursor-pointer"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-[var(--text-secondary)]" />
              ) : (
                <Sun className="w-4 h-4 text-[var(--accent-primary)]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>

      {/* Mobile Thumb-Reachable Bottom Navigation */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 h-16 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-md px-2 grid grid-cols-5 items-center"
      >
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
            pathname === '/' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span>{t('nav.explore')}</span>
        </Link>

        <Link
          href="/?view=map"
          className="flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]"
        >
          <MapPin className="w-5 h-5" />
          <span>{t('nav.map')}</span>
        </Link>

        {/* Center Primary Action: Record / Upload */}
        <Link
          href="/capture"
          aria-label={t('nav.record')}
          className="flex flex-col items-center justify-center -mt-4"
        >
          <span className="w-12 h-12 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center shadow-[var(--shadow-elevated)] border-2 border-[var(--bg-surface)]">
            <PlusCircle className="w-6 h-6" />
          </span>
        </Link>

        <Link
          href="/reels"
          className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
            pathname.startsWith('/reels') ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
          }`}
        >
          <Film className="w-5 h-5" />
          <span>{t('nav.reels')}</span>
        </Link>

        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
            pathname.startsWith('/dashboard') ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>{t('nav.dashboard')}</span>
        </Link>
      </nav>
    </div>
  );
}
