import { notFound } from "next/navigation";
import { getNovelWorkspace } from "@/lib/repositories/novels";

export default async function OutlinePage({ params }: { params: { novelSlug: string } }) {
  const workspace = await getNovelWorkspace(params.novelSlug);

  if (!workspace) {
    notFound();
  }

  return (
    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">大纲节点</p>
            <h2>故事结构树</h2>
          </div>
        </div>

        <div className="stack-column">
          {workspace.outlines.map((item) => (
            <article key={item.id} className="outline-item">
              <span className="outline-depth" style={{ width: `${item.depth * 24 + 18}px` }} />
              <div>
                <div className="title-row">
                  <h3>{item.title}</h3>
                  <span className="tag">{item.status}</span>
                </div>
                <p>{item.summary}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">伏笔追踪</p>
            <h2>待回收清单</h2>
          </div>
        </div>

        <ul className="plain-list">
          {workspace.foreshadows.map((item) => (
            <li key={item.id}>
              <strong>{item.hook}</strong>
              <p>{item.plannedPayoff ?? "暂未定义回收方案。"}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
