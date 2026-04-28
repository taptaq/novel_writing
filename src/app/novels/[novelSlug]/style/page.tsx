import { notFound } from "next/navigation";
import { NovelStyleManager } from "@/components/novel-style-manager";
import { getNovelStyleWorkspace } from "@/lib/repositories/novels";

export default async function NovelStylePage({ params }: { params: { novelSlug: string } }) {
  const workspace = await getNovelStyleWorkspace(params.novelSlug);

  if (!workspace) {
    notFound();
  }

  return <NovelStyleManager novelSlug={params.novelSlug} initialData={workspace} />;
}
