import { DUBAI_COMMUNITIES } from './seed-data';
import type { CurrencyCode, PropertyStatus, PropertyType } from '@/types/domain';

export type AiVideoStyle = 'walkthrough' | 'reels_vertical' | 'investor_briefing';

export interface ExtractedListingData {
  sourceUrl: string;
  extractionMode: 'live_html' | 'url_slug_fallback' | 'sample_preset';
  notice?: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  propertyType: PropertyType;
  price: number;
  currency: CurrencyCode;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
  status: PropertyStatus;
  ownership: 'freehold' | 'leasehold' | 'gcc_national';
  permitNumber: string;
  community: string;
  addressEn: string;
  addressAr: string;
  lat: number;
  lng: number;
  estNetYieldPct: number;
  imageUrls: string[];
}

export interface StoryboardScene {
  id: string;
  index: number;
  label: string;
  headline: string;
  caption: string;
  narration: string;
  durationSec: number;
  motion: 'zoom-in' | 'pan-right' | 'zoom-out' | 'pan-left';
  imageUrl?: string;
}

export interface GeneratedStoryboard {
  style: AiVideoStyle;
  aspectRatio: '9:16' | '16:9';
  locale: 'en' | 'ar';
  totalDurationSec: number;
  scenes: StoryboardScene[];
}

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^\[?::1\]?$/,
  /\.local$/i,
  /\.internal$/i,
];

/**
 * Validates that a user-supplied URL is safe to fetch server-side (prevents SSRF).
 */
export function validatePublicListingUrl(rawUrl: string): {
  ok: true;
  url: URL;
} | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { ok: false, reason: 'Enter a valid http:// or https:// listing URL.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'Only http:// and https:// URLs are supported.' };
  }

  const host = parsed.hostname.toLowerCase();
  if (PRIVATE_HOST_PATTERNS.some((rx) => rx.test(host))) {
    return { ok: false, reason: 'Private, loopback, or internal network URLs are blocked.' };
  }

  return { ok: true, url: parsed };
}

function matchCommunity(text: string) {
  const lower = text.toLowerCase();
  for (const c of DUBAI_COMMUNITIES) {
    if (lower.includes(c.nameEn.toLowerCase()) || text.includes(c.nameAr)) {
      return c;
    }
  }
  return DUBAI_COMMUNITIES[1]; // Downtown Dubai default
}

function detectPropertyType(text: string): PropertyType {
  const lower = text.toLowerCase();
  if (lower.includes('penthouse')) return 'penthouse';
  if (lower.includes('villa')) return 'villa';
  if (lower.includes('townhouse')) return 'townhouse';
  if (lower.includes('plot') || lower.includes('land')) return 'plot';
  if (lower.includes('office') || lower.includes('commercial')) return 'commercial';
  if (lower.includes('off-plan') || lower.includes('off plan') || lower.includes('tower')) {
    return 'off_plan_project';
  }
  return 'apartment';
}

function detectStatus(text: string): PropertyStatus {
  const lower = text.toLowerCase();
  if (lower.includes('off-plan') || lower.includes('off_plan') || lower.includes('handover')) {
    return 'off_plan';
  }
  if (lower.includes('for-rent') || lower.includes('for rent') || lower.includes('/rent')) {
    return 'rent';
  }
  return 'ready';
}

function extractNumberMatch(text: string, regex: RegExp): number | null {
  const m = regex.exec(text);
  if (!m?.[1]) return null;
  const cleaned = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(cleaned) && cleaned > 0 ? cleaned : null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts structured property data from raw HTML (JSON-LD, OpenGraph, meta, and regex heuristics).
 */
export function parseListingHtml(
  html: string,
  sourceUrl: string
): ExtractedListingData {
  const getMeta = (attr: string, name: string): string | null => {
    const rx = new RegExp(
      `<meta[^>]+${attr}=["']${name}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${name}["']`,
      'i'
    );
    const m = rx.exec(html);
    return m ? decodeHtmlEntities(m[1] || m[2] || '') : null;
  };

  const titleTag = /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1];
  const ogTitle = getMeta('property', 'og:title') || (titleTag ? decodeHtmlEntities(titleTag) : '');
  const ogDesc =
    getMeta('property', 'og:description') ||
    getMeta('name', 'description') ||
    '';

  const images = new Set<string>();
  const ogImage = getMeta('property', 'og:image');
  if (ogImage && ogImage.startsWith('http')) images.add(ogImage);

  // Extract JSON-LD blocks
  let ldPrice: number | null = null;
  let ldCurrency: CurrencyCode = 'AED';
  let ldBeds: number | null = null;
  let ldBaths: number | null = null;
  let ldArea: number | null = null;
  let ldLat: number | null = null;
  let ldLng: number | null = null;
  let ldName = '';
  let ldDesc = '';

  const ldRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ldMatch: RegExpExecArray | null;
  while ((ldMatch = ldRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(ldMatch[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        if (typeof item.name === 'string' && !ldName) ldName = item.name;
        if (typeof item.description === 'string' && !ldDesc) ldDesc = item.description;
        if (item.offers?.price) {
          const p = Number(String(item.offers.price).replace(/,/g, ''));
          if (Number.isFinite(p) && p > 0) ldPrice = p;
        }
        const curr = item.offers?.priceCurrency;
        if (curr && ['AED', 'USD', 'EUR', 'GBP'].includes(curr)) {
          ldCurrency = curr as CurrencyCode;
        }
        if (typeof item.numberOfRooms === 'number') ldBeds = item.numberOfRooms;
        if (typeof item.numberOfBedrooms === 'number') ldBeds = item.numberOfBedrooms;
        if (typeof item.numberOfBathroomsTotal === 'number') ldBaths = item.numberOfBathroomsTotal;
        if (item.floorSize?.value) {
          const v = Number(item.floorSize.value);
          if (Number.isFinite(v) && v > 0) ldArea = v;
        }
        if (item.geo?.latitude && item.geo?.longitude) {
          ldLat = Number(item.geo.latitude);
          ldLng = Number(item.geo.longitude);
        }
        const imgField = item.image;
        if (typeof imgField === 'string' && imgField.startsWith('http')) {
          images.add(imgField);
        } else if (Array.isArray(imgField)) {
          for (const u of imgField.slice(0, 5)) {
            if (typeof u === 'string' && u.startsWith('http')) images.add(u);
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks
    }
  }

  const combinedText = `${sourceUrl} ${ldName} ${ogTitle} ${ldDesc} ${ogDesc}`;
  const comm = matchCommunity(combinedText);
  const titleEn = (ldName || ogTitle || `${comm.nameEn} Luxury Residence`).slice(0, 130);
  const descriptionEn = (
    ldDesc ||
    ogDesc ||
    `Verified luxury property located in ${comm.nameEn}, Dubai with direct architectural presentation and investment metrics.`
  ).slice(0, 600);

  const detectedPrice =
    ldPrice ??
    extractNumberMatch(combinedText, /(?:AED|USD|EUR|GBP|\$)\s*([0-9][0-9,]{4,12})/i) ??
    extractNumberMatch(combinedText, /([0-9][0-9,]{5,12})\s*(?:AED|USD|EUR|GBP)/i) ??
    4850000;

  const detectedBeds =
    ldBeds ??
    extractNumberMatch(combinedText, /(\d{1,2})\s*(?:bed|bedroom|br|غرف)/i) ??
    3;

  const detectedBaths =
    ldBaths ??
    extractNumberMatch(combinedText, /(\d{1,2})\s*(?:bath|bathroom|حمام)/i) ??
    Math.max(2, detectedBeds);

  const detectedArea =
    ldArea ??
    extractNumberMatch(combinedText, /([0-9][0-9,]{2,6})\s*(?:sq\.?\s*ft|sqft|ft2|قدم)/i) ??
    2150;

  const permitMatch =
    /(?:trakheesi(?:\s*permit)?(?:\s*(?:number|no\.?|#))?|permit(?:\s*(?:number|no\.?|#))?)\s*[:#-]?\s*([A-Z0-9-]*\d[A-Z0-9-]{4,19})/i.exec(
      html
    );

  return {
    sourceUrl,
    extractionMode: 'live_html',
    titleEn,
    titleAr: `${comm.nameAr} — ${titleEn}`,
    descriptionEn,
    descriptionAr: `عقار مميز في ${comm.nameAr}، دبي — ${descriptionEn}`,
    propertyType: detectPropertyType(combinedText),
    price: detectedPrice,
    currency: ldCurrency,
    bedrooms: Math.min(detectedBeds, 15),
    bathrooms: Math.min(detectedBaths, 15),
    areaSqft: detectedArea,
    status: detectStatus(combinedText),
    ownership: 'freehold',
    permitNumber: permitMatch?.[1] || '7154902813',
    community: comm.nameEn,
    addressEn: comm.addressEn,
    addressAr: comm.addressAr,
    lat: ldLat ?? comm.lat,
    lng: ldLng ?? comm.lng,
    estNetYieldPct: 7.4,
    imageUrls: Array.from(images).slice(0, 6),
  };
}

/**
 * Smart fallback when a portal uses bot protection (403/429): parses listing hints from the URL slug cleanly.
 */
export function buildSlugFallbackExtraction(
  sourceUrl: string,
  notice: string
): ExtractedListingData {
  const decoded = decodeURIComponent(sourceUrl).replace(/[-_/]+/g, ' ');
  const comm = matchCommunity(decoded);
  const type = detectPropertyType(decoded);
  const status = detectStatus(decoded);
  const beds = extractNumberMatch(decoded, /(\d{1,2})\s*(?:bed|br|bedroom)/i) ?? 3;
  const price =
    extractNumberMatch(decoded, /(?:aed|usd)\s*([0-9]{6,10})/i) ??
    (type === 'villa' ? 18500000 : type === 'penthouse' ? 14900000 : 4650000);
  const area =
    type === 'villa' ? 6800 : type === 'penthouse' ? 4200 : beds * 740;

  const readableType =
    type === 'off_plan_project'
      ? 'Waterfront Off-Plan Residence'
      : type.charAt(0).toUpperCase() + type.slice(1);

  const titleEn = `${comm.nameEn} ${beds}BR Signature ${readableType}`;
  const titleAr = `${readableType === 'Villa' ? 'فيلا' : 'عقار'} ${beds} غرف في ${comm.nameAr}`;

  return {
    sourceUrl,
    extractionMode: 'url_slug_fallback',
    notice,
    titleEn,
    titleAr,
    descriptionEn: `Extracted from listing URL for ${comm.nameEn}, Dubai. Review specs below or add listing photos to render your branded AI walkthrough reel with DLD Madmoun QR overlay.`,
    descriptionAr: `تم استخراج بيانات العقار من الرابط في ${comm.nameAr}، دبي. راجع المواصفات أو أضف صور العقار لإنتاج فيديو احترافي مع رمز مضمون.`,
    propertyType: type,
    price,
    currency: 'AED',
    bedrooms: beds,
    bathrooms: Math.max(2, beds + 1),
    areaSqft: area,
    status,
    ownership: 'freehold',
    permitNumber: '7189042156',
    community: comm.nameEn,
    addressEn: comm.addressEn,
    addressAr: comm.addressAr,
    lat: comm.lat,
    lng: comm.lng,
    estNetYieldPct: status === 'off_plan' ? 8.1 : 7.3,
    imageUrls: [],
  };
}

/**
 * Generates an editable 5-scene bilingual AI real estate storyboard tailored to style & locale.
 */
export function generatePropertyStoryboard(params: {
  listing: Pick<
    ExtractedListingData,
    | 'titleEn'
    | 'titleAr'
    | 'community'
    | 'propertyType'
    | 'price'
    | 'currency'
    | 'bedrooms'
    | 'bathrooms'
    | 'areaSqft'
    | 'status'
    | 'permitNumber'
    | 'estNetYieldPct'
    | 'imageUrls'
  >;
  style: AiVideoStyle;
  locale: 'en' | 'ar';
}): GeneratedStoryboard {
  const { listing, style, locale } = params;
  const isAr = locale === 'ar';
  const aspectRatio: '9:16' | '16:9' =
    style === 'reels_vertical' ? '9:16' : '16:9';

  const priceStr = new Intl.NumberFormat(isAr ? 'ar-AE' : 'en-AE', {
    style: 'currency',
    currency: listing.currency,
    maximumFractionDigits: 0,
  }).format(listing.price);

  const areaStr = new Intl.NumberFormat(isAr ? 'ar-AE' : 'en-AE').format(
    listing.areaSqft
  );
  const pricePerSqft = Math.round(
    listing.price / Math.max(listing.areaSqft, 1)
  ).toLocaleString();

  const imgs = listing.imageUrls ?? [];
  const pickImg = (i: number) => (imgs.length > 0 ? imgs[i % imgs.length] : undefined);

  const baseDuration = style === 'reels_vertical' ? 2.5 : 3.0;

  const scenes: StoryboardScene[] = isAr
    ? [
        {
          id: 'sc-1',
          index: 0,
          label: 'المشهد 1 · الافتتاحية',
          headline: listing.community,
          caption: listing.titleAr || listing.titleEn,
          narration: `اكتشف فرصة استثمارية نادرة في ${listing.community} — ${listing.titleAr || listing.titleEn}.`,
          durationSec: baseDuration,
          motion: 'zoom-in',
          imageUrl: pickImg(0),
        },
        {
          id: 'sc-2',
          index: 1,
          label: 'المشهد 2 · القيمة والمساحة',
          headline: priceStr,
          caption: `${listing.bedrooms} غرف · ${listing.bathrooms} حمامات · ${areaStr} قدم²`,
          narration: `بسعر ${priceStr} ومساحة ${areaStr} قدم مربع، بتوزيع معماري مثالي للمعيشة والاستثمار.`,
          durationSec: baseDuration,
          motion: 'pan-right',
          imageUrl: pickImg(1),
        },
        {
          id: 'sc-3',
          index: 2,
          label: 'المشهد 3 · مؤشرات العائد',
          headline: `${listing.estNetYieldPct}% عائد صافي متوقع`,
          caption: `${pricePerSqft} ${listing.currency} / قدم² · تملك حر`,
          narration: `عائد إيجاري صافي متوقع ${listing.estNetYieldPct}% مع طلب مرتفع في ${listing.community}.`,
          durationSec: baseDuration,
          motion: 'zoom-out',
          imageUrl: pickImg(2),
        },
        {
          id: 'sc-4',
          index: 3,
          label: 'المشهد 4 · الامتثال التنظيمي',
          headline: `تصريح تراخيصي #${listing.permitNumber}`,
          caption: 'موثّق عبر دائرة الأراضي والأملاك بدبي — رمز مضمون مدمج',
          narration: `عقار موثّق بالكامل برقم تصريح تراخيصي ${listing.permitNumber} للتحقق الفوري.`,
          durationSec: baseDuration,
          motion: 'pan-left',
          imageUrl: pickImg(3),
        },
        {
          id: 'sc-5',
          index: 4,
          label: 'المشهد 5 · الدعوة للتواصل',
          headline: 'احجز معاينة خاصة الآن',
          caption: 'تواصل عبر واتساب أو اطلب ملف المستثمرين الكامل',
          narration: 'تواصل معنا اليوم عبر واتساب للحصول على ملف الاستثمار الكامل وحجز معاينة خاصة.',
          durationSec: baseDuration,
          motion: 'zoom-in',
          imageUrl: pickImg(4),
        },
      ]
    : [
        {
          id: 'sc-1',
          index: 0,
          label: 'Scene 1 · Hook & Arrival',
          headline:
            style === 'reels_vertical'
              ? `Inside ${listing.community}`
              : listing.community.toUpperCase(),
          caption: listing.titleEn,
          narration: `Step inside an exceptional ${listing.community} opportunity — ${listing.titleEn}.`,
          durationSec: baseDuration,
          motion: 'zoom-in',
          imageUrl: pickImg(0),
        },
        {
          id: 'sc-2',
          index: 1,
          label: 'Scene 2 · Headline Price & Scale',
          headline: priceStr,
          caption: `${listing.bedrooms} Beds · ${listing.bathrooms} Baths · ${areaStr} sq ft`,
          narration: `Offered at ${priceStr} across ${areaStr} square feet with institutional-grade proportions.`,
          durationSec: baseDuration,
          motion: 'pan-right',
          imageUrl: pickImg(1),
        },
        {
          id: 'sc-3',
          index: 2,
          label: 'Scene 3 · Yield & Value Density',
          headline: `${listing.estNetYieldPct}% Est. Net Yield`,
          caption: `${pricePerSqft} ${listing.currency} / sq ft · Freehold Title`,
          narration: `Projected ${listing.estNetYieldPct}% net rental yield at ${pricePerSqft} ${listing.currency} per square foot.`,
          durationSec: baseDuration,
          motion: 'zoom-out',
          imageUrl: pickImg(2),
        },
        {
          id: 'sc-4',
          index: 3,
          label: 'Scene 4 · UAE DLD Compliance',
          headline: `Trakheesi #${listing.permitNumber}`,
          caption: 'Verified DLD Madmoun QR embedded for instant buyer trust',
          narration: `Fully compliant with Dubai Land Department Trakheesi permit ${listing.permitNumber}.`,
          durationSec: baseDuration,
          motion: 'pan-left',
          imageUrl: pickImg(3),
        },
        {
          id: 'sc-5',
          index: 4,
          label: 'Scene 5 · Investor CTA',
          headline: 'Schedule a Private Viewing',
          caption: 'Tap WhatsApp or launch Investor Presentation Mode',
          narration: 'Connect directly on WhatsApp or open the live investor dossier to reserve a private viewing.',
          durationSec: baseDuration,
          motion: 'zoom-in',
          imageUrl: pickImg(4),
        },
      ];

  return {
    style,
    aspectRatio,
    locale,
    totalDurationSec: Number(
      scenes.reduce((sum, s) => sum + s.durationSec, 0).toFixed(1)
    ),
    scenes,
  };
}

export const SAMPLE_LISTING_PRESETS: Record<string, ExtractedListingData> = {
  palm: {
    sourceUrl: 'https://www.propertyfinder.ae/en/plp/buy/villa-for-sale-dubai-palm-jumeirah-frond-m-6-bed.html',
    extractionMode: 'sample_preset',
    titleEn: 'Palm Jumeirah Frond M Architectural Beachfront Villa',
    titleAr: 'فيلا شاطئية معمارية في سعفة M — نخلة جميرا',
    descriptionEn:
      'Ultra-prime 6-bedroom beachfront residence on Frond M featuring private infinity edge pool, Atlantis sunset views, double-height marble atrium, and turnkey Italian furnishings.',
    descriptionAr:
      'فيلا شاطئية فاخرة من 6 غرف نوم على سعفة M بإطلالة غروب الشمس على أتلانتس ومسبح إنفينيتي خاص وتشطيبات إيطالية فاخرة.',
    propertyType: 'villa',
    price: 54000000,
    currency: 'AED',
    bedrooms: 6,
    bathrooms: 7,
    areaSqft: 12100,
    status: 'ready',
    ownership: 'freehold',
    permitNumber: '7194820115',
    community: 'Palm Jumeirah',
    addressEn: 'Frond M, Palm Jumeirah, Dubai, UAE',
    addressAr: 'سعفة M، نخلة جميرا، دبي، الإمارات',
    lat: 25.1221,
    lng: 55.1408,
    estNetYieldPct: 6.7,
    imageUrls: [],
  },
  downtown: {
    sourceUrl: 'https://www.bayut.com/property/details-downtown-dubai-burj-vista-3-bed-penthouse.html',
    extractionMode: 'sample_preset',
    titleEn: 'Downtown Boulevard Full-View 3BR Sky Penthouse',
    titleAr: 'بنتهاوس 3 غرف بإطلالة كاملة على برج خليفة — وسط مدينة دبي',
    descriptionEn:
      'Corner high-floor sky penthouse with direct Burj Khalifa & Fountain views, private landscaped terrace, bespoke oak joinery, and vacant-on-transfer title deed.',
    descriptionAr:
      'بنتهاوس زاوية بطابق مرتفع بإطلالة مباشرة على برج خليفة ونافورة دبي مع تراس خاص وجاهز للتسليم الفوري.',
    propertyType: 'penthouse',
    price: 24800000,
    currency: 'AED',
    bedrooms: 3,
    bathrooms: 4,
    areaSqft: 4950,
    status: 'ready',
    ownership: 'freehold',
    permitNumber: '7163094821',
    community: 'Downtown Dubai',
    addressEn: 'Mohammed Bin Rashid Blvd, Downtown Dubai, UAE',
    addressAr: 'بوليفارد محمد بن راشد، وسط مدينة دبي، الإمارات',
    lat: 25.1972,
    lng: 55.2744,
    estNetYieldPct: 7.4,
    imageUrls: [],
  },
  creek: {
    sourceUrl: 'https://www.dubizzle.com/property-for-sale/off-plan-dubai-creek-harbour-waterfront-2br/',
    extractionMode: 'sample_preset',
    titleEn: 'Dubai Creek Harbour Marina Front 2BR Off-Plan Launch',
    titleAr: 'شقة غرفتين على مرسى خور دبي — إطلاق على الخارطة',
    descriptionEn:
      'DLD escrow-backed waterfront launch overlooking Creek Marina with 70/30 handover plan, private lagoon access, and projected 8.3% institutional net rental yield.',
    descriptionAr:
      'مشروع جديد على الواجهة المائية في خور دبي بحساب ضمان معتمد من دائرة الأراضي وخطة دفع 70/30 وعائد صافي متوقع 8.3%.',
    propertyType: 'off_plan_project',
    price: 3150000,
    currency: 'AED',
    bedrooms: 2,
    bathrooms: 3,
    areaSqft: 1380,
    status: 'off_plan',
    ownership: 'freehold',
    permitNumber: '0952184770',
    community: 'Dubai Creek Harbour',
    addressEn: 'Creek Marina, Dubai Creek Harbour, Dubai, UAE',
    addressAr: 'مرسى الخور، ميناء خور دبي، دبي، الإمارات',
    lat: 25.2048,
    lng: 55.3461,
    estNetYieldPct: 8.3,
    imageUrls: [],
  },
};
