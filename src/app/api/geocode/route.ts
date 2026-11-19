import { NextResponse } from 'next/server';
import { DUBAI_COMMUNITIES } from '@/lib/seed-data';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  // Reverse geocode
  if (latParam && lngParam) {
    const lat = Number(latParam);
    const lng = Number(lngParam);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return NextResponse.json({ results: [] }, { status: 400 });
    }

    // Find closest Dubai community immediately (fast & reliable offline)
    let closest = DUBAI_COMMUNITIES[0] as (typeof DUBAI_COMMUNITIES)[number];
    let minKm = Infinity;
    for (const c of DUBAI_COMMUNITIES) {
      const d = haversineKm(lat, lng, c.lat, c.lng);
      if (d < minKm) {
        minKm = d;
        closest = c;
      }
    }

    if (minKm <= 12) {
      return NextResponse.json({
        community: closest.nameEn,
        communityAr: closest.nameAr,
        addressEn: `${closest.addressEn} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        addressAr: `${closest.addressAr} (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        lat,
        lng,
      });
    }

    return NextResponse.json({
      community: 'Dubai',
      communityAr: 'دبي',
      addressEn: `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)}), UAE`,
      addressAr: `موقع محدد (${lat.toFixed(4)}, ${lng.toFixed(4)})، الإمارات`,
      lat,
      lng,
    });
  }

  // Forward search
  if (q) {
    const lower = q.toLowerCase();
    const matches = DUBAI_COMMUNITIES.filter(
      (c) =>
        c.nameEn.toLowerCase().includes(lower) ||
        c.nameAr.includes(q) ||
        c.addressEn.toLowerCase().includes(lower)
    );
    return NextResponse.json({
      results: matches.length > 0 ? matches : DUBAI_COMMUNITIES.slice(0, 5),
    });
  }

  return NextResponse.json({ results: DUBAI_COMMUNITIES });
}
