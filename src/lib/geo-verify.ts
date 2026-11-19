export type ProximityTier = 'on_site' | 'nearby' | 'remote' | 'unknown';

export interface ProximityVerificationResult {
  verifiedOnSite: boolean;
  distanceMeters: number | null;
  tier: ProximityTier;
}

const EARTH_RADIUS_METERS = 6_371_000;
export const ON_SITE_THRESHOLD_METERS = 250;
export const NEARBY_THRESHOLD_METERS = 1_000;

export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Verifies whether a walkthrough video was filmed physically on-site
 * by comparing capture GPS coordinates to the property's registered coordinates.
 */
export function verifyOnSiteCapture(params: {
  captureLat?: number;
  captureLng?: number;
  propertyLat: number;
  propertyLng: number;
}): ProximityVerificationResult {
  if (
    typeof params.captureLat !== 'number' ||
    typeof params.captureLng !== 'number' ||
    Number.isNaN(params.captureLat) ||
    Number.isNaN(params.captureLng)
  ) {
    return { verifiedOnSite: false, distanceMeters: null, tier: 'unknown' };
  }

  const distanceMeters = calculateDistanceMeters(
    params.captureLat,
    params.captureLng,
    params.propertyLat,
    params.propertyLng
  );

  if (distanceMeters <= ON_SITE_THRESHOLD_METERS) {
    return { verifiedOnSite: true, distanceMeters, tier: 'on_site' };
  }
  if (distanceMeters <= NEARBY_THRESHOLD_METERS) {
    return { verifiedOnSite: false, distanceMeters, tier: 'nearby' };
  }
  return { verifiedOnSite: false, distanceMeters, tier: 'remote' };
}
