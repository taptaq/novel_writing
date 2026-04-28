import { notFound } from "next/navigation";
import { GraphWorkspace } from "@/components/graph-workspace";
import { getNovelGraphData } from "@/lib/repositories/novels";

export default async function GraphPage({ params }: { params: { novelSlug: string } }) {
  const graph = await getNovelGraphData(params.novelSlug);

  if (!graph) {
    notFound();
  }

  return <GraphWorkspace graph={graph} />;
}
