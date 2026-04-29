import { notFound } from "next/navigation";
import { ChapterComposer } from "@/components/chapter-composer";
import { getDemoChapterEditor } from "@/lib/demo-data";

export default function DemoChapterPage({
  params
}: {
  params: { novelSlug: string; chapterSlug: string };
}) {
  const data = getDemoChapterEditor(params.novelSlug, params.chapterSlug);

  if (!data) {
    notFound();
  }

  return (
    <ChapterComposer
      novelSlug={params.novelSlug}
      chapterSlug={params.chapterSlug}
      data={data}
      basePath="/demo"
    />
  );
}
