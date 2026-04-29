import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecommendedNextStep } from "@/lib/novel-workflow";
import { getNovelWorkspace } from "@/lib/repositories/novels";
import { getLengthFeatureHints, getNovelLengthProfile } from "@/lib/novel-length";

export default async function NovelOverviewPage({ params }: { params: { novelSlug: string } }) {
  const workspace = await getNovelWorkspace(params.novelSlug);

  if (!workspace) {
    notFound();
  }

  const lengthProfile = getNovelLengthProfile(workspace.novel.lengthCategory);
  const lengthHints = getLengthFeatureHints(workspace.novel.lengthCategory);
  const firstChapter = workspace.chapters[0];
  const nextStep = getRecommendedNextStep({
    chapterCount: workspace.novel.chapterCount,
    entityCount: workspace.entities.length,
    outlineCount: workspace.outlines.length,
    firstChapterSlug: firstChapter?.slug
  });

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="panel-eyebrow">推荐下一步</p>
          <h1>你现在先做这一件就够了</h1>
          <div className="stack-column">
            <div>
              <h2>{nextStep.title}</h2>
              <p className="hero-text">{nextStep.description}</p>
              <p className="assist-meta">不用一次把所有模块都做完，先推进当前最关键的一步。</p>
            </div>
            <div className="title-row">
              <Link href={`/novels/${workspace.novel.slug}${nextStep.href}`} className="button-primary">
                {nextStep.actionLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="hero-metrics">
          <article className="metric-card">
            <span>章节</span>
            <strong>{workspace.novel.chapterCount} 章</strong>
          </article>
          <article className="metric-card">
            <span>人物 / 实体</span>
            <strong>{workspace.entities.length} 条</strong>
          </article>
          <article className="metric-card">
            <span>大纲</span>
            <strong>{workspace.outlines.length} 条</strong>
          </article>
        </div>
      </section>

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
              <p className="assist-meta">想直接继续写，就从这里进。</p>
            </div>
          </div>

          <div className="stack-column">
            {workspace.chapters.length > 0 ? (
              workspace.chapters.map((chapter) => (
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
              ))
            ) : (
              <p className="empty-state">还没开始写章节，先去结构页把第一章定下来。</p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">设定摘要</p>
              <h2>当前有效实体</h2>
              <p className="assist-meta">忘了人物、地点、关系时，回这里看。</p>
            </div>
          </div>

          <div className="stack-column">
            {workspace.entities.length > 0 ? (
              workspace.entities.map((entity) => (
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
              ))
            ) : (
              <p className="empty-state">还没补关键人物，先写主角、对手和关系就够了。</p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">结构状态</p>
              <h2>大纲与伏笔</h2>
              <p className="assist-meta">不知道下一章写什么时，先来这里顺一下。</p>
            </div>
          </div>

          <div className="stack-column">
            {workspace.outlines.length > 0 ? (
              workspace.outlines.map((item) => (
                <article key={item.id} className="outline-item">
                  <span className="outline-depth" style={{ width: `${item.depth * 18 + 18}px` }} />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">还没顺后续走向，先列开头几章就够了。</p>
            )}
          </div>

          <div className="divider" />

          <ul className="plain-list compact-list">
            {workspace.foreshadows.length > 0 ? (
              workspace.foreshadows.map((item) => (
                <li key={item.id}>
                  <strong>{item.hook}</strong>
                  {item.plannedPayoff ? ` · ${item.plannedPayoff}` : ""}
                </li>
              ))
            ) : (
              <li>还没记伏笔，后面想到关键埋点再补也行。</li>
            )}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">文风维护</p>
              <h2>文风资产</h2>
              <p className="assist-meta">想让 AI 更像这本书的语气，就来这里补样文和规则。</p>
            </div>
            <Link href={`/novels/${workspace.novel.slug}/style`} className="button-secondary">
              打开文风页
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
