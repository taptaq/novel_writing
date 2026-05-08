import { notFound } from "next/navigation";
import { ChapterComposer } from "@/components/chapter-composer";
import { getChapterEditorData } from "@/lib/repositories/novels";
import { decodeRouteParam } from "@/lib/route-params";

export default async function ChapterPage({
  params
}: {
  params: { novelSlug: string; chapterSlug: string };
}) {
  const novelSlug = decodeRouteParam(params.novelSlug);
  const chapterSlug = decodeRouteParam(params.chapterSlug);
  const data = await getChapterEditorData(novelSlug, chapterSlug);

  if (!data) {
    notFound();
  }

  return <ChapterComposer novelSlug={novelSlug} chapterSlug={chapterSlug} data={data} />;
}
