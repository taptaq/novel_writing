import Link from "next/link";
import { notFound } from "next/navigation";
import { getNovelWorkspace } from "@/lib/repositories/novels";
import { getLengthFeatureHints, getNovelLengthProfile } from "@/lib/novel-length";

export default async function NovelOverviewPage({ params }: { params: { novelSlug: string } }) {
  const workspace = await getNovelWorkspace(params.novelSlug);

  if (!workspace) {
    notFound();
  }

  const lengthProfile = getNovelLengthProfile(workspace.novel.lengthCategory);
  const lengthHints = getLengthFeatureHints(workspace.novel.lengthCategory);

  return (
    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">篇幅规划</p>
            <h2>{lengthProfile.label}</h2>
          </div>
        </div>

        <article className="info-card">
          <p>{lengthProfile.description}</p>
          <p>{lengthProfile.structureHint}</p>
          <div className="tag-list">
            <span className="tag">建议 {lengthProfile.defaultChapterCount} 章</span>
            <span className="tag">单章 {lengthProfile.defaultWordsPerChapter} 字</span>
          </div>
        </article>

        <ul className="plain-list compact-list">
          {lengthHints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">章节进度</p>
            <h2>写作推进</h2>
          </div>
        </div>

        <div className="stack-column">
          {workspace.chapters.map((chapter) => (
            <Link
              key={chapter.id}
              href={`/novels/${workspace.novel.slug}/chapters/${chapter.slug}`}
              className="row-card row-card-spread"
            >
              <div>
                <h3>{chapter.title}</h3>
                <p>{chapter.summary ?? chapter.excerpt}</p>
              </div>
              <div className="stats-inline">
                <span className="stat-pill">{chapter.wordCount} 字</span>
                <span className="stat-pill">{chapter.status}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">设定摘要</p>
            <h2>当前有效实体</h2>
          </div>
        </div>

        <div className="stack-column">
          {workspace.entities.map((entity) => (
            <article key={entity.id} className="info-card">
              <div className="title-row">
                <h3>{entity.name}</h3>
                <span className="tag">{entity.type}</span>
              </div>
              <p>{entity.summary}</p>
              <div className="tag-list">
                {entity.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">结构状态</p>
            <h2>大纲与伏笔</h2>
          </div>
        </div>

        <div className="stack-column">
          {workspace.outlines.map((item) => (
            <article key={item.id} className="outline-item">
              <span className="outline-depth" style={{ width: `${item.depth * 18 + 18}px` }} />
              <div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="divider" />

        <ul className="plain-list compact-list">
          {workspace.foreshadows.map((item) => (
            <li key={item.id}>
              <strong>{item.hook}</strong>
              {item.plannedPayoff ? ` · ${item.plannedPayoff}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">文风维护</p>
            <h2>文风资产</h2>
          </div>
          <Link href={`/novels/${workspace.novel.slug}/style`} className="button-secondary">
            打开文风页
          </Link>
        </div>

        <article className="info-card">
          <p>管理参考样文、风格规则与去 AI 味偏好。</p>
        </article>
      </section>
    </div>
  );
}
