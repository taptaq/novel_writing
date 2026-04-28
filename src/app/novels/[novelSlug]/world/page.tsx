import Link from "next/link";
import { notFound } from "next/navigation";
import { EntityGroup } from "@/components/entity-group";
import { getNovelWorkspace } from "@/lib/repositories/novels";

export default async function WorldPage({ params }: { params: { novelSlug: string } }) {
  const workspace = await getNovelWorkspace(params.novelSlug);

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
            <p className="panel-eyebrow">设定维护</p>
            <h2>人物 / 势力 / 地点</h2>
          </div>
          <Link href={`/novels/${workspace.novel.slug}/graph`} className="button-primary">
            打开图谱
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
