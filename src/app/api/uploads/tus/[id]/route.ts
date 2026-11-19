import { NextResponse } from 'next/server';
import {
  canPublishDirectly,
  canUploadVideo,
  getCurrentSessionUser,
} from '@/lib/auth';
import { apiError } from '@/lib/api-error';
import {
  appendTusChunk,
  finalizeVideoProcessing,
  getTusSession,
} from '@/lib/store';

const TUS_HEADERS = {
  'Tus-Resumable': '1.0.0',
  'Access-Control-Expose-Headers': 'Upload-Offset, Upload-Length, Tus-Resumable',
  'Cache-Control': 'no-store',
};

export async function HEAD(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = getTusSession(id);
  if (!session) {
    return new NextResponse(null, { status: 404, headers: TUS_HEADERS });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      ...TUS_HEADERS,
      'Upload-Offset': String(session.offsetBytes),
      'Upload-Length': String(session.sizeBytes),
    },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentSessionUser();
  if (!canUploadVideo(user.role)) {
    return apiError(403, 'FORBIDDEN', 'Unauthorized upload attempt.');
  }

  const { id } = await context.params;
  const offsetHeader = request.headers.get('upload-offset');
  if (offsetHeader === null || Number.isNaN(Number(offsetHeader))) {
    return apiError(400, 'MISSING_OFFSET', 'Upload-Offset header is required.');
  }
  const expectedOffset = Number(offsetHeader);

  const arrayBuffer = await request.arrayBuffer();
  const chunk = Buffer.from(arrayBuffer);

  const result = appendTusChunk(id, expectedOffset, chunk);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: {
          code: 'TUS_UPLOAD_ERROR',
          message: result.message,
          requestId: id,
        },
      },
      {
        status: result.status,
        headers: {
          ...TUS_HEADERS,
          ...(typeof result.currentOffset === 'number'
            ? { 'Upload-Offset': String(result.currentOffset) }
            : {}),
        },
      }
    );
  }

  let finalVideo = result.video;
  if (result.session.completed) {
    // Brief realistic stream validation pass (magic-byte check + ABR manifest registration)
    const directPublish = canPublishDirectly(user.role);
    const finalized = finalizeVideoProcessing(
      result.video.id,
      user,
      directPublish
    );
    if (finalized) {
      finalVideo = finalized;
    }
  }

  return NextResponse.json(
    {
      offset: result.session.offsetBytes,
      completed: result.session.completed,
      video: finalVideo,
    },
    {
      status: 200,
      headers: {
        ...TUS_HEADERS,
        'Upload-Offset': String(result.session.offsetBytes),
        'Upload-Length': String(result.session.sizeBytes),
      },
    }
  );
}
