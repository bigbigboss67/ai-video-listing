import type { PermitStatus } from '@/types/domain';

export type { PermitStatus };

/**
 * DLD Madmoun / Trakheesi permit links.
 *
 * A real Madmoun QR opens a page on DLD's Trakheesi site with an opaque, DLD-issued
 * token, for example:
 *   https://trakheesi.dubailand.gov.ae/rev/madmoun/listing/validation?khevJujtDig=<token>
 * That token cannot be derived from the permit number, so the portal never generates
 * these links. It stores exactly the link the agent received from DLD, and an admin
 * checks it before the listing shows as verified.
 */

export const DLD_PERMIT_HOST = 'trakheesi.dubailand.gov.ae';
/** Path prefix seen on real Madmoun listing QRs. Links outside it are flagged to the reviewer, not refused. */
export const DLD_MADMOUN_PATH_PREFIX = '/rev/madmoun/';
export const MAX_DLD_LINK_LENGTH = 2048;


export type DldLinkErrorCode = 'empty' | 'too_long' | 'not_url' | 'not_https' | 'wrong_host' | 'no_token';

export type DldLinkResult =
  | { ok: true; url: string; looksLikeMadmoun: boolean }
  | { ok: false; code: DldLinkErrorCode };

export const DLD_LINK_ERROR_MESSAGES: Record<DldLinkErrorCode, string> = {
  empty: 'Paste the link from your DLD Madmoun QR.',
  too_long: 'That link is too long to be a DLD permit link.',
  not_url: 'That is not a valid web link.',
  not_https: 'DLD permit links start with https://',
  wrong_host: `Only links on ${DLD_PERMIT_HOST} (DLD Trakheesi) are accepted.`,
  no_token: 'This link has no permit code. Copy the full link from the DLD QR.',
};

/**
 * Validate and normalise a link taken from a DLD Madmoun QR.
 * Accepts only https links on the exact Trakheesi host, with no credentials or custom port,
 * and with a path or query beyond the bare site (the DLD code).
 */
export function parseDldPermitLink(raw: string | null | undefined): DldLinkResult {
  const value = (raw ?? '').trim();
  if (!value) return { ok: false, code: 'empty' };
  if (value.length > MAX_DLD_LINK_LENGTH) return { ok: false, code: 'too_long' };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, code: 'not_url' };
  }

  if (url.protocol !== 'https:') return { ok: false, code: 'not_https' };
  if (url.hostname.toLowerCase() !== DLD_PERMIT_HOST || url.username || url.password || url.port) {
    return { ok: false, code: 'wrong_host' };
  }
  const hasPath = url.pathname.replace(/\/+$/, '').length > 0;
  if (!hasPath && !url.search) return { ok: false, code: 'no_token' };

  url.hash = '';
  return {
    ok: true,
    url: url.toString(),
    looksLikeMadmoun: url.pathname.toLowerCase().startsWith(DLD_MADMOUN_PATH_PREFIX),
  };
}

export function isDldPermitLink(raw: string | null | undefined): boolean {
  return parseDldPermitLink(raw).ok;
}
