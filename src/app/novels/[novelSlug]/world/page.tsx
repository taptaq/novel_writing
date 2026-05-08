import { notFound } from "next/navigation";
import { GraphWorkspace } from "@/components/graph-workspace";
import { EntityGroup } from "@/components/entity-group";
import { getNovelGraphData, getNovelWorkspace } from "@/lib/repositories/novels";
import { decodeRouteParam } from "@/lib/route-params";

export default async function WorldPage({ params }: { params: { novelSlug: string } }) {
  const novelSlug = decodeRouteParam(params.novelSlug);
  const [workspace, graph] = await Promise.all([
    getNovelWorkspace(novelSlug),
    getNovelGraphData(novelSlug)
  ]);

  if (!workspace || !graph) {
    notFound();
  }

  const characters = workspace.entities.filter((entity) => entity.type === "CHARACTER");
  const factions = workspace.entities.filter((entity) => entity.type === "FACTION");
  const locations = workspace.entities.filter((entity) => entity.type === "LOCATION");

  return (
    <div className="page-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">设定页</p>
            <h2>设定与关系</h2>
            <p className="assist-meta">忘了谁是谁，就回这里看。</p>
          </div>
        </div>

        <div className="tag-list">
          <span className="tag">设定卡</span>
          <span className="tag">关系图</span>
        </div>
        <p className="assist-meta">一页看完设定和关系。</p>
      </section>

      <section className="dashboard-grid entity-group-grid">
        <EntityGroup title="人物" items={characters} />
        <EntityGroup title="势力" items={factions} />
        <EntityGroup title="地点" items={locations} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">关系视图</p>
            <h2>关系图</h2>
            <p className="assist-meta">想看关系，直接看下面。</p>
          </div>
        </div>
      </section>

      <GraphWorkspace graph={graph} />
    </div>
  );
}
