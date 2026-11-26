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

  it('extracts exact Property Finder __NEXT_DATA__ Studio specs, coordinates, Madmoun QR, and high-res gallery', () => {
    const pfNextData = {
      props: {
        pageProps: {
          propertyResult: {
            property: {
              title: 'Modern Studio | Golf View | Great Investment',
              price: { value: 530000, currency: 'AED' },
              bedrooms: 'studio',
              bedrooms_value: 0,
              bathrooms: '1',
              size: { value: 402, unit: 'sqft' },
              property_type: 'Apartment',
              offering_type: 'Residential for Sale',
              completion_status: 'completed',
              location: {
                name: 'Golf Views Seven City',
                full_name: 'Golf Views Seven City, JLT Cluster Z, Jumeirah Lake Towers, Dubai',
                coordinates: { lat: 25.0791, lon: 55.1538 },
                building_details: { developer_name: 'SEVEN TIDES', swimming_pools: 4 },
              },
              location_tree: [
                { name: 'Dubai', type: 'CITY' },
                { name: 'Jumeirah Lake Towers', type: 'COMMUNITY' },
                { name: 'JLT Cluster Z', type: 'SUBCOMMUNITY' },
                { name: 'Golf Views Seven City', type: 'TOWER' },
              ],
              rera: {
                issued_license_number: '718828',
                permit_validation_url: 'https://trakheesi.dubailand.gov.ae/rev/madmoun/listing/validation?k=abc',
              },
              images: {
                property: [
                  { full: 'https://static.shared.propertyfinder.ae/media/1/1312x894.jpg' },
                  { full: 'https://static.shared.propertyfinder.ae/media/2/1312x894.jpg' },
                ],
              },
            },
          },
        },
      },
    };
    const html = `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(pfNextData)}</script></body></html>`;
    const res = parseListingHtml(
      html,
      'https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-dubai-jumeirah-lake-towers-jlt-cluster-z-golf-views-seven-city-177814401.html'
    );

    expect(res.extractionMode).toBe('next_data');
    expect(res.price).toBe(530000);
    expect(res.bedrooms).toBe(0);
    expect(res.areaSqft).toBe(402);
    expect(res.community).toContain('Jumeirah Lake Towers');
    expect(res.buildingName).toBe('Golf Views Seven City');
    expect(res.madmounQrUrl).toContain('trakheesi.dubailand.gov.ae');
    expect(res.imageUrls).toHaveLength(2);

    const storyboard = generatePropertyStoryboard({
      listing: res,
      style: 'reels_vertical',
      locale: 'en',
    });
    expect(storyboard.scenes[1].caption).toContain('Modern Studio');
    expect(storyboard.scenes[1].caption).not.toContain('0 Beds');
  });
});
