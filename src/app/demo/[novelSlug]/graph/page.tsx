import { notFound } from "next/navigation";
import { GraphWorkspace } from "@/components/graph-workspace";
import { getDemoGraphData } from "@/lib/demo-data";

export default function DemoGraphPage({ params }: { params: { novelSlug: string } }) {
  const graph = getDemoGraphData(params.novelSlug);

  if (!graph) {
    notFound();
  }

  return <GraphWorkspace graph={graph} />;
}
