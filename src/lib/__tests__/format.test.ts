import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppUrl,
  formatCurrency,
  formatDuration,
  fromAed,
  toAed,
} from '@/lib/format';

describe('Currency, Duration & Bilingual Formatting', () => {
  it('converts currencies cleanly to and from AED', () => {
    const aed = toAed(1_000_000, 'USD');
    expect(aed).toBe(3672500);
    expect(fromAed(3672500, 'USD')).toBe(1_000_000);
  });

  it('formats EN and AR currencies and durations predictably', () => {
    expect(formatCurrency(5_000_000, 'AED', 'en')).toContain('5,000,000');
    expect(formatCurrency(5_000_000, 'USD', 'ar')).toBeTruthy();
    expect(formatDuration(125)).toBe('2:05');
  });

  it('builds properly encoded WhatsApp enquiry links with Trakheesi permit', () => {
    const url = buildWhatsAppUrl({
      phone: '+971 50 444 5566',
      propertyTitle: 'Opera Penthouse',
      permitNumber: '7129384715',
      priceFormatted: 'AED 32,900,000',
      url: 'https://makanreel.ae/en/properties/opera',
      locale: 'en',
    });
    expect(url).toContain('https://wa.me/971504445566?text=');
    expect(url).toContain('7129384715');
  });
});
