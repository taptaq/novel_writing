import Link from "next/link";
import { notFound } from "next/navigation";
import { getLengthFeatureHints } from "@/lib/novel-length";
import { getRecommendedNextStep } from "@/lib/novel-workflow";
import { getNovelWorkspace } from "@/lib/repositories/novels";
import { decodeRouteParam } from "@/lib/route-params";

export default async function NovelOverviewPage({ params }: { params: { novelSlug: string } }) {
  const novelSlug = decodeRouteParam(params.novelSlug);
  const workspace = await getNovelWorkspace(novelSlug);

  if (!workspace) {
    notFound();
  }

  const firstChapter = workspace.chapters[0];
  const nextStep = getRecommendedNextStep({
    chapterCount: workspace.novel.chapterCount,
    entityCount: workspace.entities.length,
    outlineCount: workspace.outlines.length,
    firstChapterSlug: firstChapter?.slug
  });
  const structureCount = workspace.outlines.length + workspace.foreshadows.length;
  const keyCharacters = workspace.entities.filter((entity) => entity.type === "CHARACTER").length;
  const characterEntities = workspace.entities.filter((entity) => entity.type === "CHARACTER");
  const factionEntities = workspace.entities.filter((entity) => entity.type === "FACTION");
  const locationEntities = workspace.entities.filter((entity) => entity.type === "LOCATION");
  const lengthHints = getLengthFeatureHints(workspace.novel.lengthCategory);
  const showStarterWorkspace = workspace.novel.chapterCount === 0;

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
              <p className="assist-meta">先做这一件就行。</p>
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

      {showStarterWorkspace ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">起步工作区</p>
              <h2>先把这本书跑起来</h2>
              <p className="assist-meta">先看现成设定，再把第一章定下来就能开始写。</p>
            </div>
          </div>

          <div className="stack-column">
            <article className="info-card">
              <div className="title-row">
                <div>
                  <h3>第一章起步</h3>
                  <p>还没开始写，先把开场场景和第一章目标定下来。</p>
                </div>
                <Link href={`/novels/${workspace.novel.slug}/write`} className="button-secondary">
                  去写第一章
                </Link>
              </div>
              <p>{workspace.novel.premise ?? "先用一句话确定这本书的开场冲突。"} </p>
            </article>

            <div className="dashboard-grid">
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <p className="panel-eyebrow">人物</p>
                    <h3>人物列表</h3>
                  </div>
                </div>
                <div className="stack-column">
                  {characterEntities.length > 0 ? (
                    characterEntities.map((entity) => (
                      <article key={entity.id} className="info-card">
                        <div className="title-row">
                          <h3>{entity.name}</h3>
                          <span className="tag">{entity.type}</span>
                        </div>
                        <p>{entity.summary ?? "先记住这个人物的身份和当前作用。"}</p>
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
                    <p className="empty-state">还没补人物，先写主角和对手就够了。</p>
                  )}
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <p className="panel-eyebrow">势力</p>
                    <h3>势力列表</h3>
                  </div>
                </div>
                <div className="stack-column">
                  {factionEntities.length > 0 ? (
                    factionEntities.map((entity) => (
                      <article key={entity.id} className="info-card">
                        <div className="title-row">
                          <h3>{entity.name}</h3>
                          <span className="tag">{entity.type}</span>
                        </div>
                        <p>{entity.summary ?? "先写最关键的几条势力关系就够了。"}</p>
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
                    <p className="empty-state">还没补内容，先写最关键的几条就够了。</p>
                  )}
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div>
                    <p className="panel-eyebrow">地点</p>
                    <h3>地点列表</h3>
                  </div>
                </div>
                <div className="stack-column">
                  {locationEntities.length > 0 ? (
                    locationEntities.map((entity) => (
                      <article key={entity.id} className="info-card">
                        <div className="title-row">
                          <h3>{entity.name}</h3>
                          <span className="tag">{entity.type}</span>
                        </div>
                        <p>{entity.summary ?? "先把故事最常用的地点记下来。"} </p>
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
                    <p className="empty-state">还没补地点，先记住第一章最常用的场景。</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>
      ) : null}

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">主动作 1</p>
              <h2>继续写作</h2>
              <p className="assist-meta">从最近一章接着写。</p>
            </div>
          </div>

          <div className="stack-column">
            {workspace.chapters.length > 0 ? (
              <Link
                href={`/novels/${workspace.novel.slug}/chapters/${firstChapter?.slug}`}
                className="row-card row-card-spread"
              >
                <div>
                  <h3>{firstChapter?.title}</h3>
                  <p>{firstChapter?.summary ?? firstChapter?.excerpt ?? "先回到你刚刚写到的位置。"}</p>
                </div>
                <div className="stats-inline">
                  <span className="stat-pill">{firstChapter?.wordCount ?? 0} 字</span>
                  <span className="stat-pill">{firstChapter?.status ?? "DRAFT"}</span>
                </div>
              </Link>
            ) : (
              <p className="empty-state">还没开始写，先定第一章。</p>
            )}
            <Link
              href={
                firstChapter
                  ? `/novels/${workspace.novel.slug}/chapters/${firstChapter.slug}`
                  : `/novels/${workspace.novel.slug}/write`
              }
              className="button-secondary"
            >
              {firstChapter ? "继续这一章" : "开始第一章"}
            </Link>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">主动作 2</p>
              <h2>补人物和关系</h2>
              <p className="assist-meta">先把主角、对手和关系补上。</p>
            </div>
          </div>

          <div className="stack-column">
            <article className="info-card">
              <p>
                {workspace.entities.length > 0
                  ? `现在已经整理了 ${workspace.entities.length} 条设定，其中人物 ${keyCharacters} 条。`
                  : "还没补关键人物，先写主角、对手和关系就够了。"}
              </p>
              <div className="tag-list">
                <span className="tag">人物 {keyCharacters} 条</span>
                <span className="tag">
                  势力 {workspace.entities.filter((entity) => entity.type === "FACTION").length} 条
                </span>
                <span className="tag">
                  地点 {workspace.entities.filter((entity) => entity.type === "LOCATION").length} 条
                </span>
              </div>
            </article>
            <Link href={`/novels/${workspace.novel.slug}/world`} className="button-secondary">
              去补人物和关系
            </Link>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">主动作 3</p>
              <h2>看结构和伏笔</h2>
              <p className="assist-meta">不知道怎么写，就先顺一下。</p>
            </div>
          </div>

          <div className="stack-column">
            <article className="info-card">
              <p>
                {structureCount > 0
                  ? `现在已经有 ${workspace.outlines.length} 条结构和 ${workspace.foreshadows.length} 条伏笔。`
                  : "还没顺后续走向，先列开头几章和关键埋点就够了。"}
              </p>
              <div className="tag-list">
                <span className="tag">大纲 {workspace.outlines.length} 条</span>
                <span className="tag">伏笔 {workspace.foreshadows.length} 条</span>
              </div>
            </article>
            <Link href={`/novels/${workspace.novel.slug}/outline`} className="button-secondary">
              去看结构和伏笔
            </Link>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">轻提示</p>
              <h2>这本书现在更该盯什么</h2>
              <p className="assist-meta">先看最有用的就行。</p>
            </div>
          </div>

          <ul className="plain-list compact-list">
            {lengthHints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
