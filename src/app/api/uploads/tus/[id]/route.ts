import { NextResponse } from 'next/server';
import {
  canModerate,
  canPublishDirectly,
  canUploadVideo,
  getCurrentSessionUser,
} from '@/lib/auth';
import { apiError, unauthenticatedError } from '@/lib/api-error';
import type { SessionUser } from '@/types/domain';
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

// Only the uploader (or a moderator) may inspect or append to an upload session
function canAccessUpload(user: SessionUser, uploaderId: string): boolean {
  return user.id === uploaderId || canModerate(user.role);
}

export async function HEAD(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentSessionUser();
  if (!user) {
    return new NextResponse(null, { status: 401, headers: TUS_HEADERS });
  }
  const { id } = await context.params;
  const session = getTusSession(id);
  if (!session || !canAccessUpload(user, session.uploaderId)) {
    // 404 rather than 403 so session IDs of other users cannot be probed
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
  if (!user) return unauthenticatedError();
  if (!canUploadVideo(user.role)) {
    return apiError(403, 'FORBIDDEN', 'Unauthorized upload attempt.');
  }

  const { id } = await context.params;
  const existing = getTusSession(id);
  if (!existing || !canAccessUpload(user, existing.uploaderId)) {
    return apiError(404, 'UPLOAD_NOT_FOUND', 'Upload session not found.');
  }
  const offsetHeader = request.headers.get('upload-offset');
  if (offsetHeader === null || Number.isNaN(Number(offsetHeader))) {
    return apiError(400, 'MISSING_OFFSET', 'Upload-Offset header is required.');
  }
  const expectedOffset = Number(offsetHeader);

  const arrayBuffer = await request.arrayBuffer();
  if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
    return apiError(413, 'CHUNK_TOO_LARGE', 'Upload chunk exceeds maximum 5 MB limit.');
  }
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
