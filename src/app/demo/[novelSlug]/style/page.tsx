import { notFound } from "next/navigation";
import { NovelStyleManager } from "@/components/novel-style-manager";
import { getDemoStyleWorkspace } from "@/lib/demo-data";

export default async function DemoStylePage({ params }: { params: { novelSlug: string } }) {
  const workspace = getDemoStyleWorkspace(params.novelSlug);

  if (!workspace) {
    notFound();
  }

  return <NovelStyleManager novelSlug={params.novelSlug} initialData={workspace} />;
}
