import { NextResponse } from 'next/server';
import {
  canModerate,
  canViewAuditLogs,
  canViewDashboard,
  getCurrentSessionUser,
} from '@/lib/auth';
import { apiError } from '@/lib/api-error';
import {
  getAnalyticsSummary,
  listAllVideos,
  listAuditLogs,
} from '@/lib/store';

export async function GET() {
  const user = await getCurrentSessionUser();
  if (!canViewDashboard(user.role)) {
    return apiError(
      403,
      'FORBIDDEN',
      'Dashboard access requires Agent, Manager, or Admin permissions.'
    );
  }

  const allVideos = listAllVideos();
  const visibleVideos = canModerate(user.role)
    ? allVideos
    : allVideos.filter((v) => v.uploaderId === user.id || v.uploadStatus === 'ready');

  return NextResponse.json(
    {
      user,
      permissions: {
        canModerate: canModerate(user.role),
        canViewAuditLogs: canViewAuditLogs(user.role),
      },
      analytics: getAnalyticsSummary(),
      videos: visibleVideos,
      auditLogs: canViewAuditLogs(user.role) ? listAuditLogs(50) : [],
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
