import Link from "next/link";
import { getNovelSummaries } from "@/lib/repositories/novels";

export default async function NovelsPage() {
  const novels = await getNovelSummaries();

  return (
    <div className="page-stack">
      <section className="panel library-panel">
        <div className="library-header">
          <div>
            <p className="panel-eyebrow">作品库</p>
            <h1>选择一个项目继续推进</h1>
            <p className="library-summary">从最近的小说项目进入结构、设定和章节工作区。</p>
          </div>

          <Link href="/novels/new" className="button-primary">
            新建书籍
          </Link>
        </div>

        <div className="library-list">
          {novels.map((novel) => {
            const summary =
              novel.summary ?? novel.premise ?? "进入这个项目，继续整理结构、设定与章节内容。";

            return (
              <Link href={`/novels/${novel.slug}`} key={novel.id} className="project-entry-card">
                <div className="project-entry-copy">
                  <h3>{novel.title}</h3>
                  <p>{summary}</p>
                </div>
                <div className="stats-inline">
                  <span className="stat-pill">{novel.genre ?? "未分类"}</span>
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
