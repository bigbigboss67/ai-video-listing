import { describe, expect, it, beforeEach } from 'vitest';
import {
  evaluateAntiScraper,
  resetAntiScraperStateForTests,
} from '../anti-scraper';

describe('Anti-Scraper Shield', () => {
  beforeEach(() => {
    resetAntiScraperStateForTests();
  });

  it('blocks curl, python-requests, Scrapy, HeadlessChrome, and AI bots', () => {
    const blockedUAs = [
      'curl/8.4.0',
      'python-requests/2.31.0',
      'Scrapy/2.11.0',
      'Mozilla/5.0 HeadlessChrome/120.0.0.0',
      'GPTBot/1.0',
      'CCBot/2.0',
      'Bytespider',
    ];
    for (const ua of blockedUAs) {
      const verdict = evaluateAntiScraper({
        pathname: '/api/properties',
        method: 'GET',
        userAgent: ua,
        ip: '198.51.100.10',
      });
      expect(verdict.blocked).toBe(true);
      expect(verdict.status).toBe(403);
    }
  });

  it('allows normal desktop and mobile browsers', () => {
    const verdict = evaluateAntiScraper({
      pathname: '/api/properties',
      method: 'GET',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
      ip: '203.0.113.42',
    });
    expect(verdict.blocked).toBe(false);
    expect(verdict.status).toBe(200);
  });

  it('blocks Googlebot on /api/* while allowing Googlebot on public HTML pages', () => {
    const apiVerdict = evaluateAntiScraper({
      pathname: '/api/properties',
      method: 'GET',
      userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      ip: '66.249.66.1',
    });
    expect(apiVerdict.blocked).toBe(true);
    expect(apiVerdict.status).toBe(403);

    const pageVerdict = evaluateAntiScraper({
      pathname: '/en',
      method: 'GET',
      userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      ip: '66.249.66.1',
    });
    expect(pageVerdict.blocked).toBe(false);
  });

  it('bans IPs that hit honeypot trap routes', () => {
    const trap = evaluateAntiScraper({
      pathname: '/api/bulk-dump',
      method: 'GET',
      userAgent: 'Mozilla/5.0 Chrome/128.0.0.0',
      ip: '198.51.100.99',
    });
    expect(trap.blocked).toBe(true);
    expect(trap.reason).toBe('HONEYPOT_TRIGGERED');

    const followup = evaluateAntiScraper({
      pathname: '/en',
      method: 'GET',
      userAgent: 'Mozilla/5.0 Chrome/128.0.0.0',
      ip: '198.51.100.99',
    });
    expect(followup.blocked).toBe(true);
    expect(followup.reason).toBe('IP_TEMP_BANNED');
  });

  it('enforces per-IP rate limiting on API requests', () => {
    const ip = '203.0.113.77';
    for (let i = 0; i < 60; i++) {
      const v = evaluateAntiScraper({
        pathname: '/api/properties',
        method: 'GET',
        userAgent: 'Mozilla/5.0 Chrome/128.0.0.0',
        ip,
        now: 1_700_000_000_000,
      });
      expect(v.blocked).toBe(false);
    }
    const over = evaluateAntiScraper({
      pathname: '/api/properties',
      method: 'GET',
      userAgent: 'Mozilla/5.0 Chrome/128.0.0.0',
      ip,
      now: 1_700_000_000_000,
    });
    expect(over.blocked).toBe(true);
    expect(over.status).toBe(429);
    expect(over.retryAfterSec).toBeGreaterThan(0);
  });
});
