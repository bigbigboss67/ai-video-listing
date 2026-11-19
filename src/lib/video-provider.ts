import crypto from 'crypto';

export interface CloudflareDirectUploadResult {
  uploadUrl: string;
  assetId: string;
  provider: 'cloudflare_stream' | 'local_tus';
}

export function isCloudflareStreamConfigured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_STREAM_API_TOKEN
  );
}

/**
 * Creates a TUS-enabled Direct Creator Upload URL on Cloudflare Stream when configured.
 * Falls back cleanly to local TUS endpoint in zero-key local/demo mode.
 */
export async function requestCloudflareTusUpload(params: {
  maxDurationSeconds: number;
  sizeBytes: number;
  filename: string;
  creatorId: string;
}): Promise<CloudflareDirectUploadResult | null> {
  if (!isCloudflareStreamConfigured()) return null;

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN!;
  const metadata = [
    `name ${Buffer.from(params.filename).toString('base64')}`,
    `maxDurationSeconds ${Buffer.from(String(params.maxDurationSeconds)).toString('base64')}`,
  ].join(',');

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': String(params.sizeBytes),
        'Upload-Metadata': metadata,
        'Upload-Creator': params.creatorId,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Cloudflare Stream direct upload failed: ${res.status}`);
  }

  const uploadUrl = res.headers.get('location');
  const assetId = res.headers.get('stream-media-id') ?? crypto.randomUUID();
  if (!uploadUrl) {
    throw new Error('Cloudflare Stream did not return a Location header');
  }

  return { uploadUrl, assetId, provider: 'cloudflare_stream' };
}

export function verifyCloudflareWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  // Format: time=<ts>,sig1=<hex>
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((kv) => kv.split('='))
  );
  if (!parts.time || !parts.sig1) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${parts.time}.${rawBody}`)
    .digest('hex');

  const sigBuf = Buffer.from(parts.sig1);
  const expBuf = Buffer.from(expected);
  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
}
