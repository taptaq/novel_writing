import Link from "next/link";
import { notFound } from "next/navigation";
import { EntityGroup } from "@/components/entity-group";
import { getDemoWorkspace } from "@/lib/demo-data";

export default function DemoWorldPage({ params }: { params: { novelSlug: string } }) {
  const workspace = getDemoWorkspace(params.novelSlug);

  if (!workspace) {
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
            <h2>人物、势力、地点都在这里</h2>
            <p className="assist-meta">忘了谁是谁、谁跟谁有关，就回这里补和查。</p>
          </div>
          <Link href={`/demo/${workspace.novel.slug}/graph`} className="button-primary">
            去看关系图
          </Link>
        </div>
      </section>

      <section className="dashboard-grid entity-group-grid">
        <EntityGroup title="人物" items={characters} />
        <EntityGroup title="势力" items={factions} />
        <EntityGroup title="地点" items={locations} />
      </section>
    </div>
  );
}
