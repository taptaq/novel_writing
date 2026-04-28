import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNovelWorkspace } from "@/lib/repositories/novels";
import { WorkspaceNav } from "@/components/workspace-nav";

export default async function NovelWorkspaceLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { novelSlug: string };
}) {
  const workspace = await getNovelWorkspace(params.novelSlug);

  if (!workspace) {
    notFound();
  }

  const firstChapter = workspace.chapters[0];

  return (
    <div className="page-stack">
      <section className="workspace-hero">
        <div>
          <p className="panel-eyebrow">作品工作区</p>
          <h1>{workspace.novel.title}</h1>
          <p className="hero-text">{workspace.novel.summary ?? workspace.novel.premise}</p>
        </div>

        <div className="stack-column align-end">
          <div className="stats-inline">
            <span className="stat-pill">{workspace.novel.chapterCount} 章</span>
            <span className="stat-pill">{workspace.novel.wordCount} 字</span>
            <span className="stat-pill">{workspace.novel.tone ?? "未定义语气"}</span>
          </div>
          {firstChapter ? (
            <Link className="button-secondary" href={`/novels/${workspace.novel.slug}/chapters/${firstChapter.slug}`}>
              继续写作
            </Link>
          ) : null}
        </div>
      </section>

      <WorkspaceNav novelSlug={workspace.novel.slug} firstChapterSlug={firstChapter?.slug} />

      {children}
    </div>
  );
}
