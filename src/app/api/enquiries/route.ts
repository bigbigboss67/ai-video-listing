import { NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth';
import { apiError, checkRateLimit, zodApiError } from '@/lib/api-error';
import { getClientIpFromHeaders } from '@/lib/anti-scraper';
import { createEnquiry } from '@/lib/store';
import { createEnquirySchema } from '@/lib/validation';

export async function POST(request: Request) {
  // Guests may enquire; rate-limit by account when signed in, otherwise by client IP
  const user = await getCurrentSessionUser();
  const rlKey = user ? `enquiry:user:${user.id}` : `enquiry:ip:${getClientIpFromHeaders(request.headers)}`;
  const rl = checkRateLimit(rlKey, 15, 60_000);
  if (!rl.allowed) {
    return apiError(429, 'RATE_LIMITED', 'Too many enquiries submitted. Please wait.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'INVALID_JSON', 'Invalid JSON body.');
  }

  const parsed = createEnquirySchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error);
  }

  const enquiry = createEnquiry(parsed.data, user ?? undefined);
  if (!enquiry) {
    return apiError(404, 'PROPERTY_NOT_FOUND', 'Property not found.');
  }

  return NextResponse.json({ enquiry }, { status: 201 });
}
