import { describe, expect, it } from 'vitest';
import {
  buildSlugFallbackExtraction,
  generatePropertyStoryboard,
  parseListingHtml,
  validatePublicListingUrl,
} from '@/lib/url-extractor';

describe('AI URL-to-Video Studio — SSRF Guard, Extraction & Storyboard', () => {
  it('blocks private, localhost, and non-HTTP URLs to prevent SSRF', () => {
    expect(validatePublicListingUrl('http://localhost:3000/secret').ok).toBe(false);
    expect(validatePublicListingUrl('http://127.0.0.1/admin').ok).toBe(false);
    expect(validatePublicListingUrl('http://169.254.169.254/latest/meta-data').ok).toBe(false);
    expect(validatePublicListingUrl('http://192.168.1.5/listing').ok).toBe(false);
    expect(validatePublicListingUrl('file:///etc/passwd').ok).toBe(false);

    const valid = validatePublicListingUrl('https://www.propertyfinder.ae/en/buy/dubai-marina');
    expect(valid.ok).toBe(true);
  });

  it('extracts structured listing fields from JSON-LD and OpenGraph HTML', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Luxury 4BR Villa in Palm Jumeirah" />
          <meta property="og:description" content="Beachfront 4 bedroom villa with private pool." />
          <meta property="og:image" content="https://cdn.example.com/villa.jpg" />
          <script type="application/ld+json">
            {
              "@type": "Residence",
              "name": "Frond K Signature Villa",
              "numberOfBedrooms": 4,
              "numberOfBathroomsTotal": 5,
              "floorSize": { "value": 8400 },
              "offers": { "price": "38500000", "priceCurrency": "AED" },
              "geo": { "latitude": 25.119, "longitude": 55.135 }
            }
          </script>
        </head>
        <body>Trakheesi Permit: 7198765432</body>
      </html>
    `;

    const extracted = parseListingHtml(html, 'https://example.ae/palm-villa');
    expect(extracted.titleEn).toBe('Frond K Signature Villa');
    expect(extracted.price).toBe(38500000);
    expect(extracted.bedrooms).toBe(4);
    expect(extracted.bathrooms).toBe(5);
    expect(extracted.areaSqft).toBe(8400);
    expect(extracted.community).toBe('Palm Jumeirah');
    expect(extracted.permitNumber).toBe('7198765432');
    expect(extracted.imageUrls).toContain('https://cdn.example.com/villa.jpg');
  });

  it('falls back cleanly to URL slug extraction when a portal blocks scraping', () => {
    const res = buildSlugFallbackExtraction(
      'https://www.bayut.com/property/dubai-marina-3-bed-penthouse-for-sale',
      'Anti-bot 403'
    );
    expect(res.extractionMode).toBe('url_slug_fallback');
    expect(res.community).toBe('Dubai Marina');
    expect(res.propertyType).toBe('penthouse');
    expect(res.bedrooms).toBe(3);
  });

  it('generates 5-scene bilingual EN and AR storyboards across all styles', () => {
    const listing = buildSlugFallbackExtraction(
      'https://www.propertyfinder.ae/en/buy/downtown-dubai-2-bed-apartment',
      'test'
    );

    const enReel = generatePropertyStoryboard({
      listing,
      style: 'reels_vertical',
      locale: 'en',
    });
    expect(enReel.aspectRatio).toBe('9:16');
    expect(enReel.scenes).toHaveLength(5);
    expect(enReel.scenes[3].headline).toContain(listing.permitNumber);

    const arBriefing = generatePropertyStoryboard({
      listing,
      style: 'investor_briefing',
      locale: 'ar',
    });
    expect(arBriefing.aspectRatio).toBe('16:9');
    expect(arBriefing.scenes).toHaveLength(5);
    expect(arBriefing.scenes[0].label).toContain('المشهد');
  });
});
