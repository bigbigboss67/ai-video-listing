import crypto from 'crypto';
import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';
import type { ApiErrorEnvelope } from '@/types/domain';

export function apiError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>
): NextResponse<ApiErrorEnvelope> {
  const requestId = crypto.randomUUID().slice(0, 12);
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(fieldErrors ? { fieldErrors } : {}),
        requestId,
      },
    },
    { status }
  );
}

export function zodApiError(err: ZodError): NextResponse<ApiErrorEnvelope> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_root';
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return apiError(
    400,
    'VALIDATION_ERROR',
    'Request validation failed. Check highlighted fields.',
    fieldErrors
  );
}

// Sliding-window rate limiter (uses in-memory store in local mode; ready for Upstash Redis)
const rateWindows = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (rateWindows.get(key) ?? []).filter((t) => t > cutoff);
  if (timestamps.length >= limit) {
    const resetAt = timestamps[0] + windowMs;
    rateWindows.set(key, timestamps);
    return { allowed: false, remaining: 0, resetAt };
  }
  timestamps.push(now);
  rateWindows.set(key, timestamps);
  return {
    allowed: true,
    remaining: Math.max(0, limit - timestamps.length),
    resetAt: now + windowMs,
  };
}
