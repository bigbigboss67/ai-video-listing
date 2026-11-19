import { NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth';
import { eraseUserData, exportUserData } from '@/lib/store';

export async function GET() {
  const user = await getCurrentSessionUser();
  const payload = exportUserData(user);
  return NextResponse.json(payload, {
    headers: {
      'Content-Disposition': 'attachment; filename="makanreel-pdpl-export.json"',
      'Cache-Control': 'no-store',
    },
  });
}

export async function DELETE() {
  const user = await getCurrentSessionUser();
  const receipt = eraseUserData(user);
  return NextResponse.json({
    deleted: true,
    ...receipt,
    timestamp: new Date().toISOString(),
  });
}
