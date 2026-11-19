import type { CurrencyCode } from '@/types/domain';

// Indicative FX rates relative to AED (pegged 3.6725 to USD)
export const FX_FROM_AED: Record<CurrencyCode, number> = {
  AED: 1,
  USD: 1 / 3.6725,
  EUR: 1 / 3.98,
  GBP: 1 / 4.65,
};

export function toAed(amount: number, currency: CurrencyCode): number {
  return Math.round(amount / FX_FROM_AED[currency]);
}

export function fromAed(amountAed: number, targetCurrency: CurrencyCode): number {
  return Math.round(amountAed * FX_FROM_AED[targetCurrency]);
}

export function formatCurrency(
  amountAed: number,
  currency: CurrencyCode,
  locale: string,
  compact = false
): string {
  const converted = fromAed(amountAed, currency);
  const intlLocale = locale === 'ar' ? 'ar-AE' : 'en-AE';
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(converted);
}

export function formatArea(areaSqft: number, locale: string): string {
  const intlLocale = locale === 'ar' ? 'ar-AE' : 'en-AE';
  return new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits: 0,
  }).format(areaSqft);
}

export function formatDate(isoString: string, locale: string): string {
  const intlLocale = locale === 'ar' ? 'ar-AE' : 'en-AE';
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(isoString));
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function buildWhatsAppUrl(params: {
  phone: string;
  propertyTitle: string;
  permitNumber: string;
  priceFormatted: string;
  url: string;
  locale: string;
}): string {
  const digits = params.phone.replace(/[^\d]/g, '');
  const text =
    params.locale === 'ar'
      ? `مرحباً، أود الاستفسار عن العقار "${params.propertyTitle}" (${params.priceFormatted}) - تصريح تراخيصي: ${params.permitNumber}. الرابط: ${params.url}`
      : `Hello, I am interested in "${params.propertyTitle}" (${params.priceFormatted}) — Trakheesi Permit: ${params.permitNumber}. Link: ${params.url}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}
