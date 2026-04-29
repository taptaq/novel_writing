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
            <p className="panel-eyebrow">大纲页</p>
            <h2>不知道后面怎么写时，就先看这里</h2>
            <p className="assist-meta">把后面几章的大概走向顺一下，就不容易写着写着跑偏。</p>
            <p className="assist-meta">这一段大概怎么发展，会落在下面这些节点里。</p>
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
            <p className="panel-eyebrow">伏笔页</p>
            <h2>还没回收的线索</h2>
            <p className="assist-meta">把后面还要回应的点记在这里，就不容易忘。</p>
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
