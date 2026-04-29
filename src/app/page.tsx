import Link from "next/link";
import { getNovelSummariesWithSource } from "@/lib/repositories/novels";
import { getNovelLengthProfile } from "@/lib/novel-length";

export default async function HomePage() {
  const { novels, source } = await getNovelSummariesWithSource();
  const recentNovel =
    source === "database"
      ? [...novels].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0]
      : undefined;
  const isDemoFallback = source === "demo";
  const landingSummary = "你可以先看示例，先理解流程；也可以直接新建一本，边写边补。";
  const primaryCta = recentNovel
    ? {
        href: `/novels/${recentNovel.slug}`,
        label: "继续我的书"
      }
    : {
        href: "/novels",
        label: "先看示例"
      };
  const sampleBasePath = isDemoFallback ? "/demo" : "/novels";

  return (
    <div className="page-stack landing-stack">
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="panel-eyebrow">第 1 步</p>
          <h1>写小说，不用一下子想清全部</h1>
          <p className="landing-summary">{landingSummary}</p>
          {isDemoFallback ? <p className="assist-meta">这是演示流程，不会写进你的真实作品。</p> : null}
          <div className="action-row landing-action-row">
            <Link className="button-primary" href={primaryCta.href}>
              {primaryCta.label}
            </Link>
            <Link className="button-secondary" href="/novels/new">
              直接新建一本
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-projects">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">{isDemoFallback ? "示例项目" : "我的作品"}</p>
            <h2>{isDemoFallback ? "先看看别人怎么推进" : "回到你的书继续写"}</h2>
          </div>
        </div>

        <div className="landing-project-list">
          {novels.map((novel) => {
            const lengthProfile = getNovelLengthProfile(novel.lengthCategory);
            const summary = isDemoFallback
              ? novel.summary ?? novel.premise ?? "先打开这个示例项目，看看从设定到写作是怎么推进的。"
              : novel.summary ?? novel.premise ?? "回到这本书，继续你上次写到的地方。";

            return (
              <Link key={novel.id} href={`${sampleBasePath}/${novel.slug}`} className="project-entry-card">
                <div className="project-entry-copy">
                  <h3>{novel.title}</h3>
                  <p>{summary}</p>
                </div>
                <div className="stats-inline">
                  <span className="stat-pill">{novel.genre ?? "未分类"}</span>
                  <span className="stat-pill">{lengthProfile.label}</span>
                  <span className="stat-pill">{novel.chapterCount} 章</span>
                  <span className="stat-pill">{novel.wordCount} 字</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
