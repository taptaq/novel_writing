import { notFound } from "next/navigation";
import { NovelStyleManager } from "@/components/novel-style-manager";
import { getNovelStyleWorkspace } from "@/lib/repositories/novels";
import { decodeRouteParam } from "@/lib/route-params";

export default async function NovelStylePage({ params }: { params: { novelSlug: string } }) {
  const novelSlug = decodeRouteParam(params.novelSlug);
  const workspace = await getNovelStyleWorkspace(novelSlug);

  if (!workspace) {
    notFound();
  }

  return <NovelStyleManager novelSlug={novelSlug} initialData={workspace} />;
}
