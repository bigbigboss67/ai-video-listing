import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, zodApiError } from '@/lib/api-error';
import { recordVideoWatchTelemetry } from '@/lib/store';

const telemetrySchema = z.object({
  deltaWatchSec: z.number().min(0).max(300).default(0),
  incrementView: z.boolean().default(false),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'INVALID_JSON', 'Invalid JSON body.');
  }

  const parsed = telemetrySchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error);
  }

  const { id } = await context.params;
  const updated = recordVideoWatchTelemetry(
    id,
    parsed.data.deltaWatchSec,
    parsed.data.incrementView
  );
  if (!updated) {
    return apiError(404, 'VIDEO_NOT_FOUND', 'Video not found.');
  }

  return NextResponse.json({
    viewCount: updated.viewCount,
    totalWatchSec: updated.totalWatchSec,
  });
}
