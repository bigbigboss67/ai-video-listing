import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { getPropertyBySlug } from '@/lib/store';

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const property = getPropertyBySlug(slug);
  if (!property) {
    return apiError(404, 'NOT_FOUND', `Property "${slug}" was not found.`);
  }
  return NextResponse.json({ property }, { headers: { 'Cache-Control': 'no-store' } });
}
