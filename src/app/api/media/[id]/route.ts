import fs from 'fs';
import { NextResponse } from 'next/server';
import { canModerate, getCurrentSessionUser } from '@/lib/auth';
import { getTusSession, getVideoById } from '@/lib/store';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (id === 'sample') {
    // Return 204 so the AdaptiveVideoPlayer smoothly displays the interactive architectural preview canvas for seeded items
    return new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  }

  const session = getTusSession(id);
  if (!session || !fs.existsSync(session.filePath)) {
    return NextResponse.json(
      { error: { code: 'MEDIA_NOT_FOUND', message: 'Video file not found', requestId: id } },
      { status: 404 }
    );
  }

  // Unpublished media (processing, in review, rejected) is visible only to its uploader and moderators
  const video = getVideoById(session.videoId);
  const isPublic = video?.uploadStatus === 'ready' && video.moderationStatus === 'approved';
  if (!isPublic) {
    const user = await getCurrentSessionUser();
    if (!user || (user.id !== session.uploaderId && !canModerate(user.role))) {
      return NextResponse.json(
        { error: { code: 'MEDIA_NOT_FOUND', message: 'Video file not found', requestId: id } },
        { status: 404 }
      );
    }
  }
  const cacheControl = isPublic ? 'public, max-age=300' : 'private, no-store';

  const stat = fs.statSync(session.filePath);
  const fileSize = stat.size;
  const contentType = session.mimeType || 'video/mp4';
  const rangeHeader = request.headers.get('range');

  if (rangeHeader) {
    const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
    if (match) {
      const start = Math.min(Number(match[1]), Math.max(0, fileSize - 1));
      const maxEnd = Math.min(start + 2 * 1024 * 1024 - 1, fileSize - 1);
      const end = match[2]
        ? Math.min(Number(match[2]), maxEnd)
        : Math.min(start + 1024 * 1024 - 1, fileSize - 1);
      const chunkSize = Math.max(0, end - start + 1);
      const buffer = Buffer.alloc(chunkSize);
      const fd = fs.openSync(session.filePath, 'r');
      try {
        fs.readSync(fd, buffer, 0, chunkSize, start);
      } finally {
        fs.closeSync(fd);
      }

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
          'Content-Disposition': 'inline',
          'X-Robots-Tag': 'noindex, noai, noimageai',
          'Cache-Control': isPublic ? 'private, max-age=300' : 'private, no-store',
        },
      });
    }
  }

  const fileBuf = fs.readFileSync(session.filePath);
  return new NextResponse(fileBuf, {
    status: 200,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Length': String(fileSize),
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    },
  });
}
