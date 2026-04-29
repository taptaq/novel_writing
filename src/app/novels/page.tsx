import Link from "next/link";
import { getNovelSummariesWithSource } from "@/lib/repositories/novels";
import { getNovelLengthProfile } from "@/lib/novel-length";

export default async function NovelsPage() {
  const { novels, source } = await getNovelSummariesWithSource();
  const isDemoFallback = source === "demo";
  const title = isDemoFallback ? "先看一个示例，熟悉完整流程" : "先选一本，继续往下写";
  const summary = isDemoFallback
    ? "这里是演示用的作品，只是带你看流程。看完后再正式开书。"
    : "先回到你要推进的那一本，系统会告诉你下一步先做什么。";
  const note = isDemoFallback
    ? "示例项目不会写进你的真实作品。"
    : "没有作品也没关系，直接建一本就行。";
  const novelBasePath = isDemoFallback ? "/demo" : "/novels";

  return (
    <div className="page-stack">
      <section className="panel library-panel">
        <div className="library-header">
          <div>
            <p className="panel-eyebrow">第 1 步</p>
            <h1>{title}</h1>
            <p className="library-summary">{summary}</p>
            <p>{note}</p>
          </div>

          <Link href="/novels/new" className="button-primary">
            新建一本书
          </Link>
        </div>

        <div className="library-list">
          {novels.map((novel) => {
            const cardSummary = isDemoFallback
              ? novel.summary ?? novel.premise ?? "先打开这个示例项目，熟悉一下从设定到写作的流程。"
              : novel.summary ?? novel.premise ?? "建议先回到项目总览，看看系统推荐你下一步先做什么。";
            const lengthProfile = getNovelLengthProfile(novel.lengthCategory);

            return (
              <Link href={`${novelBasePath}/${novel.slug}`} key={novel.id} className="project-entry-card">
                <div className="project-entry-copy">
                  <h3>{novel.title}</h3>
                  <p>{cardSummary}</p>
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
