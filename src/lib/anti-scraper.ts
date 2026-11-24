/**
 * Multi-layered Anti-Scraper & Bot Defense Engine (Edge-compatible).
 *
 * Layer 1: Known scraper / headless / AI-crawler User-Agent blocking.
 * Layer 2: Honeypot trap endpoints that auto-ban offending IPs for 15 minutes.
 * Layer 3: Per-IP sliding-window rate limiting on /api/* and pages.
 * Layer 4: Strict security & anti-AI-indexing headers (noai, noimageai, DENY framing).
 */

export const SCRAPER_UA_REGEX =
  /(?:curl\/|wget\/|python-requests|python-urllib|httpx|aiohttp|scrapy|httpclient|go-http-client|libwww-perl|httrack|phantomjs|headlesschrome|puppeteer|playwright|selenium|webdriver|gptbot|chatgpt-user|ccbot|bytespider|claudebot|anthropic-ai|google-extended|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|dataforseobot|amazonbot|meta-externalagent|diffbot|omgili|applebot-extended|perplexitybot|cohere-ai|barkrowler|blexbot|yandexbot|baiduspider|sogou|mj12|nikto|sqlmap|masscan|zgrab)/i;

export const SEARCH_BOT_REGEX = /(?:googlebot|bingbot|duckduckbot|slurp|applebot)/i;

export const HONEYPOT_PATHS = new Set([
  '/api/internal-export',
  '/api/bulk-dump',
  '/api/all-listings-dump',
  '/api/export-all',
  '/wp-login.php',
  '/.env',
]);

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateStore = new Map<string, RateBucket>();
const bannedIps = new Map<string, number>();

const BAN_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function getClientIpFromHeaders(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'unknown';
}

export function isIpBanned(ip: string, now = Date.now()): boolean {
  const until = bannedIps.get(ip);
  if (!until) return false;
  if (now >= until) {
    bannedIps.delete(ip);
    return false;
  }
  return true;
}

export function banIp(ip: string, now = Date.now()): void {
  if (!ip || ip === 'unknown') return;
  bannedIps.set(ip, now + BAN_DURATION_MS);
}

export function checkSlidingRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const existing = rateStore.get(key);
  if (!existing || now >= existing.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic cleanup to keep memory bounded
    if (rateStore.size > 5000) {
      for (const [k, v] of rateStore.entries()) {
        if (now >= v.resetAt) rateStore.delete(k);
      }
    }
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSec: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSec: 0,
  };
}

export interface AntiScraperVerdict {
  blocked: boolean;
  status: number;
  reason?: string;
  retryAfterSec?: number;
}

export function evaluateAntiScraper(params: {
  pathname: string;
  method: string;
  userAgent: string;
  ip: string;
  now?: number;
}): AntiScraperVerdict {
  const now = params.now ?? Date.now();
  const ua = (params.userAgent || '').trim();
  const isApi = params.pathname.startsWith('/api/');

  // 1. Honeypot trap check
  if (HONEYPOT_PATHS.has(params.pathname.toLowerCase())) {
    banIp(params.ip, now);
    return { blocked: true, status: 403, reason: 'HONEYPOT_TRIGGERED' };
  }

  // 2. Existing IP ban check
  if (isIpBanned(params.ip, now)) {
    return { blocked: true, status: 403, reason: 'IP_TEMP_BANNED' };
  }

  // 3. Scraper / headless / AI crawler User-Agent block
  if (SCRAPER_UA_REGEX.test(ua)) {
    return { blocked: true, status: 403, reason: 'SCRAPER_UA_BLOCKED' };
  }

  // 4. Empty UA or search crawlers hitting /api/* endpoints
  if (isApi) {
    if (!ua || ua.length < 8) {
      return { blocked: true, status: 403, reason: 'MISSING_UA_ON_API' };
    }
    if (SEARCH_BOT_REGEX.test(ua)) {
      return { blocked: true, status: 403, reason: 'CRAWLER_BLOCKED_ON_API' };
    }
  }

  // 5. Per-IP sliding-window rate limit
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(params.method.toUpperCase());
  const limit = isApi ? (isMutation ? 25 : 60) : 120;
  const bucketKey = `${isApi ? (isMutation ? 'api-mut' : 'api-get') : 'page'}:${params.ip}`;
  const rl = checkSlidingRateLimit(bucketKey, limit, 60_000, now);
  if (!rl.allowed) {
    return {
      blocked: true,
      status: 429,
      reason: 'RATE_LIMITED',
      retryAfterSec: rl.retryAfterSec,
    };
  }

  return { blocked: false, status: 200 };
}

export const ANTI_SCRAPER_HEADERS: Record<string, string> = {
  'X-Robots-Tag': 'noai, noimageai',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)',
};

export function resetAntiScraperStateForTests(): void {
  rateStore.clear();
  bannedIps.clear();
}
