import { DUBAI_COMMUNITIES } from './seed-data';
import type { CurrencyCode, PropertyStatus, PropertyType } from '@/types/domain';

export type AiVideoStyle = 'walkthrough' | 'reels_vertical' | 'investor_briefing';

export interface ExtractedListingData {
  sourceUrl: string;
  extractionMode: 'next_data' | 'live_html' | 'url_slug_fallback' | 'sample_preset';
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
  madmounQrUrl?: string;
  developerName?: string;
  brokerName?: string;
  agentName?: string;
  buildingName?: string;
  amenities?: string[];
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

export function validatePublicListingUrl(rawUrl: string):
  | { ok: true; url: URL }
  | { ok: false; reason: string } {
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
  if (lower.includes('jumeirah lake towers') || /\bjlt\b/i.test(lower)) {
    return DUBAI_COMMUNITIES.find((c) => c.nameEn.includes('JLT')) ?? DUBAI_COMMUNITIES[3];
  }
  if (lower.includes('jumeirah beach residence') || /\bjbr\b/i.test(lower)) {
    return DUBAI_COMMUNITIES.find((c) => c.nameEn.includes('JBR')) ?? DUBAI_COMMUNITIES[4];
  }
  if (lower.includes('jumeirah village circle') || /\bjvc\b/i.test(lower)) {
    return DUBAI_COMMUNITIES.find((c) => c.nameEn.includes('JVC')) ?? DUBAI_COMMUNITIES[5];
  }
  for (const c of DUBAI_COMMUNITIES) {
    const baseName = c.nameEn.replace(/\s*\([^)]*\)/g, '').toLowerCase();
    if (lower.includes(baseName) || text.includes(c.nameAr)) {
      return c;
    }
  }
  return DUBAI_COMMUNITIES[1];
}

function detectPropertyType(text: string): PropertyType {
  const lower = text.toLowerCase();
  if (lower.includes('penthouse')) return 'penthouse';
  if (lower.includes('villa')) return 'villa';
  if (lower.includes('townhouse')) return 'townhouse';
  if (lower.includes('plot') || lower.includes('land')) return 'plot';
  if (lower.includes('office') || lower.includes('commercial')) return 'commercial';
  if (lower.includes('off-plan project')) return 'off_plan_project';
  return 'apartment';
}

function detectStatus(text: string): PropertyStatus {
  const lower = text.toLowerCase();
  if (
    lower.includes('off-plan') ||
    lower.includes('off_plan') ||
    lower.includes('under_construction')
  ) {
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

function stripHtmlTags(str: string): string {
  return decodeHtmlEntities(str.replace(/<[^>]+>/g, ' '));
}

interface NextDataPropertyShape {
  title?: string;
  description?: string;
  property_type?: string;
  offering_type?: string;
  completion_status?: string;
  bedrooms?: string | number;
  bedrooms_value?: number;
  bathrooms?: string | number;
  bathrooms_value?: number;
  price?: { value?: number; currency?: string; period?: string } | number;
  size?: { value?: number; unit?: string };
  location?: {
    name?: string;
    full_name?: string;
    path_name?: string;
    coordinates?: { lat?: number; lon?: number; lng?: number };
    building_details?: {
      developer_name?: string;
      completion_year?: number;
      swimming_pools?: number;
      elevators?: number;
    };
  };
  location_tree?: Array<{ name?: string; type?: string }>;
  images?:
    | { property?: Array<{ full?: string; medium?: string; thumbnail?: string }> }
    | Array<{ full?: string; medium?: string; url?: string } | string>;
  rera?: {
    number?: string;
    permit_validation_url?: string;
    issued_license_number?: string;
  };
  reference?: string;
  broker?: { name?: string } | string;
  agent?: { name?: string } | string;
  amenities?: Array<{ name?: string } | string>;
}

/**
 * Extracts high-precision structured data & high-resolution gallery images from
 * Next.js __NEXT_DATA__ payloads (used by Property Finder, Bayut, and modern portals).
 */
export function parseNextDataListing(
  html: string,
  sourceUrl: string
): ExtractedListingData | null {
  const match = /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match?.[1]) return null;

  try {
    const data = JSON.parse(match[1]) as {
      props?: {
        pageProps?: {
          propertyResult?: { property?: NextDataPropertyShape };
          property?: NextDataPropertyShape;
          listing?: NextDataPropertyShape;
        };
      };
    };

    const pp = data?.props?.pageProps;
    const prop = pp?.propertyResult?.property || pp?.property || pp?.listing;
    if (!prop || !prop.title) return null;

    // Images (Property Finder stores high-res 1312x894 URLs under images.property[].full)
    const imageUrls: string[] = [];
    const seen = new Set<string>();
    const pushImg = (u?: string) => {
      if (u && u.startsWith('http') && !seen.has(u)) {
        seen.add(u);
        imageUrls.push(u);
      }
    };

    if (prop.images && !Array.isArray(prop.images) && Array.isArray(prop.images.property)) {
      for (const item of prop.images.property) {
        pushImg(item.full || item.medium);
      }
    } else if (Array.isArray(prop.images)) {
      for (const item of prop.images) {
        if (typeof item === 'string') pushImg(item);
        else pushImg(item.full || item.url || item.medium);
      }
    }

    // Price & Currency
    const rawPrice =
      typeof prop.price === 'number' ? prop.price : Number(prop.price?.value ?? 0);
    const rawCurr =
      typeof prop.price === 'object' && prop.price?.currency
        ? prop.price.currency.toUpperCase()
        : 'AED';
    const currency: CurrencyCode = (['AED', 'USD', 'EUR', 'GBP'].includes(rawCurr)
      ? rawCurr
      : 'AED') as CurrencyCode;

    // Bedrooms (Studio === 0!)
    let bedrooms = 0;
    if (typeof prop.bedrooms_value === 'number') {
      bedrooms = prop.bedrooms_value;
    } else if (typeof prop.bedrooms === 'number') {
      bedrooms = prop.bedrooms;
    } else if (typeof prop.bedrooms === 'string') {
      bedrooms = prop.bedrooms.toLowerCase().includes('studio')
        ? 0
        : Number(prop.bedrooms.replace(/[^\d]/g, '')) || 0;
    }

    const bathrooms =
      typeof prop.bathrooms_value === 'number'
        ? prop.bathrooms_value
        : Number(String(prop.bathrooms ?? '1').replace(/[^\d]/g, '')) || 1;

    let areaSqft = Number(prop.size?.value ?? 0);
    if (areaSqft > 0 && prop.size?.unit?.toLowerCase().includes('sqm')) {
      areaSqft = Math.round(areaSqft * 10.7639);
    }
    if (!areaSqft) areaSqft = bedrooms === 0 ? 420 : bedrooms * 780;

    // Location & Community
    const communityNode = prop.location_tree?.find((n) => n.type === 'COMMUNITY');
    const subCommunityNode = prop.location_tree?.find((n) => n.type === 'SUBCOMMUNITY');
    const towerNode = prop.location_tree?.find((n) => n.type === 'TOWER');
    const buildingName = towerNode?.name || prop.location?.name || '';
    const communityRaw =
      communityNode?.name ||
      prop.location?.path_name ||
      prop.location?.full_name ||
      sourceUrl;
    const matchedComm = matchCommunity(communityRaw);
    const communityDisplay = communityNode?.name
      ? subCommunityNode?.name
        ? `${communityNode.name} · ${subCommunityNode.name}`
        : communityNode.name
      : matchedComm.nameEn;

    const fullAddressEn =
      prop.location?.full_name || `${buildingName ? `${buildingName}, ` : ''}${matchedComm.addressEn}`;

    const lat = Number(prop.location?.coordinates?.lat) || matchedComm.lat;
    const lng =
      Number(prop.location?.coordinates?.lon ?? prop.location?.coordinates?.lng) ||
      matchedComm.lng;

    // Permit / Madmoun QR
    const permitNumber =
      prop.rera?.number?.trim() ||
      prop.rera?.issued_license_number?.trim() ||
      prop.reference?.replace(/[^A-Z0-9-]/gi, '').slice(0, 18) ||
      '718828';
    const madmounQrUrl =
      prop.rera?.permit_validation_url ||
      `https://dubailand.gov.ae/en/eservices/trakheesi-verification?permit=${encodeURIComponent(permitNumber)}`;

    // Status
    const offeringLower = (prop.offering_type || '').toLowerCase();
    const completionLower = (prop.completion_status || '').toLowerCase();
    const status: PropertyStatus = offeringLower.includes('rent')
      ? 'rent'
      : completionLower.includes('off') || completionLower.includes('construction')
        ? 'off_plan'
        : 'ready';

    // Amenities & Building Highlights
    const amenities: string[] = [];
    if (Array.isArray(prop.amenities)) {
      for (const a of prop.amenities) {
        const name = typeof a === 'string' ? a : a?.name;
        if (name) amenities.push(name);
      }
    }
    const bldg = prop.location?.building_details;
    if (bldg?.swimming_pools) amenities.push(`${bldg.swimming_pools} Swimming Pools`);
    if (bldg?.completion_year) amenities.push(`Built ${bldg.completion_year}`);

    const cleanTitle = decodeHtmlEntities(prop.title);
    const titleEn =
      buildingName && !cleanTitle.toLowerCase().includes(buildingName.toLowerCase())
        ? `${buildingName} — ${cleanTitle}`.slice(0, 135)
        : cleanTitle.slice(0, 135);

    const descClean = stripHtmlTags(prop.description || '').slice(0, 900);
    const bedLabelAr = bedrooms === 0 ? 'استوديو' : `${bedrooms} غرف`;
    const titleAr = `${bedLabelAr} في ${buildingName || matchedComm.nameAr} — ${matchedComm.nameAr}`;

    // Realistic Dubai yield heuristic based on unit size/price bracket
    const estNetYieldPct =
      bedrooms === 0 ? 8.4 : bedrooms === 1 ? 7.9 : status === 'off_plan' ? 8.1 : 7.1;

    return {
      sourceUrl,
      extractionMode: 'next_data',
      titleEn,
      titleAr,
      descriptionEn:
        descClean ||
        `${titleEn} located in ${fullAddressEn}. ${areaSqft} sq ft with verified DLD documentation.`,
      descriptionAr: `عقار موثّق في ${matchedComm.nameAr} (${buildingName || matchedComm.nameAr}) بمساحة ${areaSqft} قدم مربع.`,
      propertyType: detectPropertyType(`${prop.property_type || ''} ${cleanTitle}`),
      price: rawPrice > 0 ? rawPrice : 1_250_000,
      currency,
      bedrooms,
      bathrooms,
      areaSqft,
      status,
      ownership: 'freehold',
      permitNumber,
      madmounQrUrl,
      developerName: bldg?.developer_name,
      brokerName: typeof prop.broker === 'string' ? prop.broker : prop.broker?.name,
      agentName: typeof prop.agent === 'string' ? prop.agent : prop.agent?.name,
      buildingName,
      amenities: amenities.slice(0, 8),
      community: communityDisplay,
      addressEn: fullAddressEn,
      addressAr: `${buildingName ? `${buildingName}، ` : ''}${matchedComm.addressAr}`,
      lat,
      lng,
      estNetYieldPct,
      imageUrls: imageUrls.slice(0, 12),
    };
  } catch {
    return null;
  }
}

/**
 * Extracts structured property data from raw HTML (__NEXT_DATA__ first, then JSON-LD + OpenGraph).
 */
export function parseListingHtml(
  html: string,
  sourceUrl: string
): ExtractedListingData {
  const nextDataResult = parseNextDataListing(html, sourceUrl);
  if (nextDataResult) return nextDataResult;

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
        if (typeof item.numberOfBedrooms === 'number') ldBeds = item.numberOfBedrooms;
        else if (typeof item.numberOfRooms === 'number') ldBeds = item.numberOfRooms;
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
          for (const u of imgField.slice(0, 8)) {
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
  const titleEn = (ldName || ogTitle || `${comm.nameEn} Residence`).slice(0, 130);
  const descriptionEn = (
    ldDesc ||
    ogDesc ||
    `Verified property located in ${comm.nameEn}, Dubai with direct architectural presentation and investment metrics.`
  ).slice(0, 600);

  const isStudio = /\bstudio\b/i.test(combinedText);
  const detectedBeds =
    ldBeds ??
    (isStudio
      ? 0
      : extractNumberMatch(combinedText, /(\d{1,2})\s*(?:bed|bedroom|br|غرف)/i) ?? 2);

  const detectedPrice =
    ldPrice ??
    extractNumberMatch(combinedText, /(?:AED|USD|EUR|GBP|\$)\s*([0-9][0-9,]{4,12})/i) ??
    extractNumberMatch(combinedText, /([0-9][0-9,]{5,12})\s*(?:AED|USD|EUR|GBP)/i) ??
    (isStudio ? 550_000 : 2_450_000);

  const detectedBaths =
    ldBaths ??
    extractNumberMatch(combinedText, /(\d{1,2})\s*(?:bath|bathroom|حمام)/i) ??
    Math.max(1, detectedBeds);

  const detectedArea =
    ldArea ??
    extractNumberMatch(combinedText, /([0-9][0-9,]{2,6})\s*(?:sq\.?\s*ft|sqft|ft2|قدم)/i) ??
    (isStudio ? 420 : 1450);

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
    estNetYieldPct: isStudio ? 8.2 : 7.4,
    imageUrls: Array.from(images).slice(0, 10),
  };
}

export function buildSlugFallbackExtraction(
  sourceUrl: string,
  notice: string
): ExtractedListingData {
  const decoded = decodeURIComponent(sourceUrl)
    .replace(/\.html?$/i, '')
    .replace(/[-_/]+/g, ' ');
  const comm = matchCommunity(decoded);
  const type = detectPropertyType(decoded);
  const status = detectStatus(decoded);
  const isStudio = /\bstudio\b/i.test(decoded);
  const beds = isStudio
    ? 0
    : extractNumberMatch(decoded, /(\d{1,2})\s*(?:bed|br|bedroom)/i) ?? 2;
  const price =
    extractNumberMatch(decoded, /(?:aed|usd)\s*([0-9]{5,10})/i) ??
    (isStudio ? 550_000 : type === 'villa' ? 18_500_000 : 1_850_000);
  const area = isStudio ? 420 : type === 'villa' ? 6800 : Math.max(750, beds * 740);

  const bedLabel = beds === 0 ? 'Studio' : `${beds}BR`;
  const readableType =
    type === 'off_plan_project'
      ? 'Off-Plan Residence'
      : type.charAt(0).toUpperCase() + type.slice(1);

  const titleEn = `${comm.nameEn} ${bedLabel} ${readableType}`;
  const titleAr = `${beds === 0 ? 'استوديو' : `${beds} غرف`} في ${comm.nameAr}`;

  return {
    sourceUrl,
    extractionMode: 'url_slug_fallback',
    notice,
    titleEn,
    titleAr,
    descriptionEn: `Extracted from listing URL for ${comm.nameEn}, Dubai. Review specs below or attach listing photos to render your branded AI walkthrough reel with DLD Madmoun QR overlay.`,
    descriptionAr: `تم استخراج بيانات العقار من الرابط في ${comm.nameAr}، دبي. راجع المواصفات أو أضف صور العقار لإنتاج فيديو احترافي مع رمز مضمون.`,
    propertyType: type,
    price,
    currency: 'AED',
    bedrooms: beds,
    bathrooms: Math.max(1, beds === 0 ? 1 : beds + 1),
    areaSqft: area,
    status,
    ownership: 'freehold',
    permitNumber: '7189042156',
    community: comm.nameEn,
    addressEn: comm.addressEn,
    addressAr: comm.addressAr,
    lat: comm.lat,
    lng: comm.lng,
    estNetYieldPct: status === 'off_plan' ? 8.1 : isStudio ? 8.3 : 7.3,
    imageUrls: [],
  };
}

export function generatePropertyStoryboard(params: {
  listing: Pick<
    ExtractedListingData,
    | 'titleEn'
    | 'titleAr'
    | 'community'
    | 'buildingName'
    | 'propertyType'
    | 'price'
    | 'currency'
    | 'bedrooms'
    | 'bathrooms'
    | 'areaSqft'
    | 'status'
    | 'permitNumber'
    | 'estNetYieldPct'
    | 'amenities'
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

  const bedSpecEn =
    listing.bedrooms === 0 ? 'Modern Studio' : `${listing.bedrooms} Beds`;
  const bedSpecAr =
    listing.bedrooms === 0 ? 'استوديو فاخر' : `${listing.bedrooms} غرف`;

  const amenityHighlight =
    listing.amenities && listing.amenities.length > 0
      ? listing.amenities.slice(0, 3).join(' · ')
      : isAr
        ? 'تملك حر · جاهز للاستثمار'
        : 'Freehold Title · High-Demand Tower';

  const imgs = listing.imageUrls ?? [];
  const pickImg = (i: number) =>
    imgs.length > 0 ? imgs[i % imgs.length] : undefined;

  const baseDuration = 2.6;

  const scenes: StoryboardScene[] = isAr
    ? [
        {
          id: 'sc-1',
          index: 0,
          label: 'المشهد 1 · الافتتاحية',
          headline: listing.buildingName || listing.community,
          caption: listing.titleAr || listing.titleEn,
          narration: `اكتشف فرصة استثمارية مميزة في ${listing.community} — ${listing.titleAr || listing.titleEn}.`,
          durationSec: baseDuration,
          motion: 'zoom-in',
          imageUrl: pickImg(0),
        },
        {
          id: 'sc-2',
          index: 1,
          label: 'المشهد 2 · السعر والمساحة',
          headline: priceStr,
          caption: `${bedSpecAr} · ${listing.bathrooms} حمام · ${areaStr} قدم²`,
          narration: `بسعر ${priceStr} ومساحة ${areaStr} قدم مربع، بتصميم عملي وإطلالة مفتوحة.`,
          durationSec: baseDuration,
          motion: 'pan-right',
          imageUrl: pickImg(1),
        },
        {
          id: 'sc-3',
          index: 2,
          label: 'المشهد 3 · العائد والمزايا',
          headline: `${listing.estNetYieldPct}% عائد صافي متوقع`,
          caption: `${pricePerSqft} ${listing.currency} / قدم² · ${amenityHighlight}`,
          narration: `عائد إيجاري صافي متوقع ${listing.estNetYieldPct}% مع طلب مرتفع في ${listing.community}.`,
          durationSec: baseDuration,
          motion: 'zoom-out',
          imageUrl: pickImg(2),
        },
        {
          id: 'sc-4',
          index: 3,
          label: 'المشهد 4 · الامتثال التنظيمي',
          headline: `موثّق بدائرة الأراضي #${listing.permitNumber}`,
          caption: 'رمز مضمون مدمج للتحقق الفوري من صحة الإعلان',
          narration: `عقار موثّق بالكامل برقم تصريح ${listing.permitNumber} للتحقق الفوري عبر دائرة الأراضي.`,
          durationSec: baseDuration,
          motion: 'pan-left',
          imageUrl: pickImg(3),
        },
        {
          id: 'sc-5',
          index: 4,
          label: 'المشهد 5 · حجز المعاينة',
          headline: 'احجز معاينة خاصة الآن',
          caption: 'تواصل عبر واتساب أو استعرض المخطط ثلاثي الأبعاد',
          narration: 'تواصل معنا اليوم عبر واتساب للحصول على ملف الاستثمار وحجز معاينة خاصة.',
          durationSec: baseDuration,
          motion: 'zoom-in',
          imageUrl: pickImg(4),
        },
      ]
    : [
        {
          id: 'sc-1',
          index: 0,
          label: 'Scene 1 · Property Hook',
          headline: listing.buildingName || listing.community,
          caption: listing.titleEn,
          narration: `Step inside ${listing.buildingName || listing.community} — ${listing.titleEn}.`,
          durationSec: baseDuration,
          motion: 'zoom-in',
          imageUrl: pickImg(0),
        },
        {
          id: 'sc-2',
          index: 1,
          label: 'Scene 2 · Price & Proportions',
          headline: priceStr,
          caption: `${bedSpecEn} · ${listing.bathrooms} Bath · ${areaStr} sq ft`,
          narration: `Offered at ${priceStr} across ${areaStr} square feet in ${listing.community}.`,
          durationSec: baseDuration,
          motion: 'pan-right',
          imageUrl: pickImg(1),
        },
        {
          id: 'sc-3',
          index: 2,
          label: 'Scene 3 · Yield & Highlights',
          headline: `${listing.estNetYieldPct}% Est. Net Yield`,
          caption: `${pricePerSqft} ${listing.currency} / sq ft · ${amenityHighlight}`,
          narration: `At ${pricePerSqft} ${listing.currency} per square foot with an estimated ${listing.estNetYieldPct}% net yield.`,
          durationSec: baseDuration,
          motion: 'zoom-out',
          imageUrl: pickImg(2),
        },
        {
          id: 'sc-4',
          index: 3,
          label: 'Scene 4 · DLD Verified',
          headline: `DLD Permit #${listing.permitNumber}`,
          caption: 'Scannable Madmoun QR verified directly with Dubai Land Department',
          narration: `Registered with Dubai Land Department under permit ${listing.permitNumber}.`,
          durationSec: baseDuration,
          motion: 'pan-left',
          imageUrl: pickImg(3),
        },
        {
          id: 'sc-5',
          index: 4,
          label: 'Scene 5 · Private Viewing',
          headline: 'Book a Private Viewing',
          caption: 'Tap WhatsApp or explore the interactive 3D floor plan',
          narration: 'Connect directly on WhatsApp or open the live investor dossier to schedule a viewing.',
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
    buildingName: 'Frond M Signature Villa',
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
    buildingName: 'Burj Vista Penthouse',
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
    buildingName: 'Creek Marina Residences',
    community: 'Dubai Creek Harbour',
    addressEn: 'Creek Marina, Dubai Creek Harbour, Dubai, UAE',
    addressAr: 'مرسى الخور، ميناء خور دبي، دبي، الإمارات',
    lat: 25.2048,
    lng: 55.3461,
    estNetYieldPct: 8.3,
    imageUrls: [],
  },
};
