import { NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth';
import { apiError, checkRateLimit, zodApiError } from '@/lib/api-error';
import { createEnquiry } from '@/lib/store';
import { createEnquirySchema } from '@/lib/validation';

export async function POST(request: Request) {
  const user = await getCurrentSessionUser();
  const rl = checkRateLimit(`enquiry:${user.id}`, 15, 60_000);
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

  const enquiry = createEnquiry(parsed.data, user);
  if (!enquiry) {
    return apiError(404, 'PROPERTY_NOT_FOUND', 'Property not found.');
  }

  return NextResponse.json({ enquiry }, { status: 201 });
}
