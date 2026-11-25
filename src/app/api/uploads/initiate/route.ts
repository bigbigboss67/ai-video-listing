import { NextResponse } from 'next/server';
import { canUploadVideo, getCurrentSessionUser } from '@/lib/auth';
import { apiError, checkRateLimit, unauthenticatedError, zodApiError } from '@/lib/api-error';
import { createVideoUploadSession } from '@/lib/store';
import { initiateUploadSchema } from '@/lib/validation';
import {
  isCloudflareStreamConfigured,
  requestCloudflareTusUpload,
} from '@/lib/video-provider';

export async function POST(request: Request) {
  const user = await getCurrentSessionUser();
  if (!user) return unauthenticatedError();
  if (!canUploadVideo(user.role)) {
    return apiError(
      403,
      'FORBIDDEN',
      'Only authenticated agents, managers, or admins may upload listing videos.'
    );
  }

  const rl = checkRateLimit(`upload-init:${user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return apiError(429, 'RATE_LIMITED', 'Upload rate limit exceeded. Try again shortly.');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, 'INVALID_JSON', 'Invalid JSON body.');
  }

  const parsed = initiateUploadSchema.safeParse(body);
  if (!parsed.success) {
    return zodApiError(parsed.error);
  }

  const created = createVideoUploadSession({
    propertyId: parsed.data.propertyId,
    actor: user,
    filename: parsed.data.filename,
    mimeType: parsed.data.mimeType,
    sizeBytes: parsed.data.sizeBytes,
    durationSec: parsed.data.durationSec,
    posterDataUrl: parsed.data.posterDataUrl,
    captureLat: parsed.data.captureLat,
    captureLng: parsed.data.captureLng,
  });

  if (!created) {
    return apiError(404, 'PROPERTY_NOT_FOUND', 'The selected property does not exist.');
  }

  let tusUploadUrl = `/api/uploads/tus/${created.tusSession.id}`;
  let provider: 'cloudflare_stream' | 'local_tus' = 'local_tus';

  if (isCloudflareStreamConfigured()) {
    try {
      const cf = await requestCloudflareTusUpload({
        maxDurationSeconds: 180,
        sizeBytes: parsed.data.sizeBytes,
        filename: parsed.data.filename,
        creatorId: user.id,
      });
      if (cf) {
        tusUploadUrl = cf.uploadUrl;
        provider = cf.provider;
      }
    } catch (err) {
      return apiError(
        502,
        'VIDEO_PROVIDER_ERROR',
        err instanceof Error ? err.message : 'Failed to initialize Cloudflare Stream upload.'
      );
    }
  }

  return NextResponse.json(
    {
      video: created.video,
      tusSessionId: created.tusSession.id,
      tusUploadUrl,
      provider,
      expiresAt: created.tusSession.expiresAt,
      chunkSizeBytes: 512 * 1024, // 512 KB chunks for crisp live progress & quick resume
    },
    { status: 201 }
  );
}
