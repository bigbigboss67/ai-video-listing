import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { verifyCloudflareWebhookSignature } from '@/lib/video-provider';
import { finalizeVideoProcessing, getVideoByAssetId } from '@/lib/store';
import { SYSTEM_WEBHOOK_ACTOR } from '@/lib/demo-accounts';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('webhook-signature');

  const webhookSecret = (process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      return apiError(
        503,
        'WEBHOOK_NOT_CONFIGURED',
        'Cloudflare Stream webhook secret is not configured.'
      );
    }
  } else if (!verifyCloudflareWebhookSignature(rawBody, signature)) {
    return apiError(401, 'INVALID_SIGNATURE', 'Webhook signature verification failed.');
  }

  try {
    const payload = JSON.parse(rawBody) as {
      uid?: string;
      readyToStream?: boolean;
      status?: { state?: string };
    };

    if (payload.uid && payload.readyToStream) {
      const video = getVideoByAssetId(payload.uid);
      if (video) {
        finalizeVideoProcessing(video.id, SYSTEM_WEBHOOK_ACTOR, true);
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return apiError(400, 'INVALID_PAYLOAD', 'Malformed webhook payload.');
  }
}
