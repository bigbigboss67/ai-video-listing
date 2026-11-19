import { getPropertyById } from '@/lib/store';

export async function GET(
  request: Request,
  context: { params: Promise<{ locale: string }> }
) {
  const { locale } = await context.params;
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('propertyId') ?? '';
  const prop = getPropertyById(propertyId);

  const isAr = locale === 'ar';
  const title = prop ? (isAr ? prop.titleAr : prop.titleEn) : isAr ? 'جولة عقارية موثقة' : 'Verified Property Walkthrough';
  const community = prop?.community ?? 'Dubai';
  const permit = prop?.permitNumber ?? 'DLD-VERIFIED';

  const vtt = isAr
    ? `WEBVTT

00:00.000 --> 00:05.000
مرحباً بكم في الجولة المرئية لعقار: ${title}

00:05.000 --> 00:12.000
الموقع: ${community} — رقم تصريح تراخيصي: ${permit}
`
    : `WEBVTT

00:00.000 --> 00:05.000
Welcome to the verified video walkthrough of ${title}.

00:05.000 --> 00:12.000
Location: ${community} — Dubai Land Department Trakheesi Permit ${permit}.
`;

  return new Response(vtt, {
    headers: {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
