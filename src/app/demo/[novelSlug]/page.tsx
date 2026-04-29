import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecommendedNextStep } from "@/lib/novel-workflow";
import { getDemoWorkspace } from "@/lib/demo-data";
import { getLengthFeatureHints, getNovelLengthProfile } from "@/lib/novel-length";

export default function DemoOverviewPage({ params }: { params: { novelSlug: string } }) {
  const workspace = getDemoWorkspace(params.novelSlug);

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
          <p className="panel-eyebrow">示例下一步</p>
          <h1>先看看这套流程怎么跑</h1>
          <div className="stack-column">
            <div>
              <h2>{nextStep.title}</h2>
              <p className="hero-text">{nextStep.description}</p>
              <p className="assist-meta">这是示例链路，你可以先照着走一遍，再去正式创建自己的书。</p>
            </div>
            <div className="title-row">
              <Link href={`/demo/${workspace.novel.slug}${nextStep.href}`} className="button-primary">
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
            {workspace.chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/demo/${workspace.novel.slug}/chapters/${chapter.slug}`}
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
              <p className="assist-meta">忘了人物、地点、关系时，回这里看。</p>
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
              <p className="assist-meta">不知道下一章写什么时，先来这里顺一下。</p>
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
              <p className="assist-meta">想让 AI 更像这本书的语气，就来这里补样文和规则。</p>
            </div>
            <Link href={`/demo/${workspace.novel.slug}/style`} className="button-secondary">
              打开文风页
            </Link>
          </div>

          <article className="info-card">
            <p>这里主要是给 AI 学这本书该怎么说话、怎么落句子。</p>
          </article>
        </section>
      </div>
    </div>
  );
}
