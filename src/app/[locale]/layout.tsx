import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';
import {
  IBM_Plex_Sans_Arabic,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from 'next/font/google';
import { routing } from '@/i18n/routing';
import { getCurrentSessionUser } from '@/lib/auth';
import { AppProvider } from '@/components/providers/AppProvider';
import { AppShell } from '@/components/layout/AppShell';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MakanReel — Investor-Grade Video Property Portal',
  description:
    'Mobile-first video property listing portal with live web sync, UAE DLD/RERA Trakheesi & Madmoun QR compliance, bilingual EN/AR RTL, and fullscreen Investor Presentation Mode.',
};

export const viewport: Viewport = {
  themeColor: '#12151A',
  width: 'device-width',
  initialScale: 1,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const [messages, initialUser] = await Promise.all([
    getMessages(),
    getCurrentSessionUser(),
  ]);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${ibmPlexArabic.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppProvider initialUser={initialUser}>
            <AppShell>{children}</AppShell>
          </AppProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
