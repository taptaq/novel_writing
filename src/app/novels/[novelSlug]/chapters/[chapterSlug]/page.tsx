import { notFound } from "next/navigation";
import { ChapterComposer } from "@/components/chapter-composer";
import { getChapterEditorData } from "@/lib/repositories/novels";

export default async function ChapterPage({
  params
}: {
  params: { novelSlug: string; chapterSlug: string };
}) {
  const data = await getChapterEditorData(params.novelSlug, params.chapterSlug);

  if (!data) {
    notFound();
  }

  return <ChapterComposer novelSlug={params.novelSlug} chapterSlug={params.chapterSlug} data={data} />;
}
