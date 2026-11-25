import { NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth';

// Read-only: returns the signed-in user or null. Sign in via POST /api/auth/login.
export async function GET() {
  const user = await getCurrentSessionUser();
  return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
}
