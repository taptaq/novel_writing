import { notFound, redirect } from "next/navigation";
import { createChapter, getNovelWorkspace } from "@/lib/repositories/novels";
import { decodeRouteParam, encodeRouteParam } from "@/lib/route-params";

export default async function NovelWritePage({ params }: { params: { novelSlug: string } }) {
  const novelSlug = decodeRouteParam(params.novelSlug);
  const workspace = await getNovelWorkspace(novelSlug);

  if (!workspace) {
    notFound();
  }

  const firstChapter = workspace.chapters[0];
  const encodedNovelSlug = encodeRouteParam(novelSlug);

  if (firstChapter) {
    redirect(`/novels/${encodedNovelSlug}/chapters/${encodeRouteParam(firstChapter.slug)}`);
  }

  const result = await createChapter(novelSlug);
  redirect(`/novels/${encodedNovelSlug}/chapters/${encodeRouteParam(result.chapter.slug)}`);
}
