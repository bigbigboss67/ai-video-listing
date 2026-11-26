import { AiVideoStudio } from '@/components/ai-studio/AiVideoStudio';

export const dynamic = 'force-dynamic';

export default async function AiStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  return <AiVideoStudio initialUrl={url ?? ''} />;
}
