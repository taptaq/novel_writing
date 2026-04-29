import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceNav } from "@/components/workspace-nav";
import { getDemoWorkspace } from "@/lib/demo-data";
import { getNovelLengthProfile } from "@/lib/novel-length";

export default function DemoWorkspaceLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { novelSlug: string };
}) {
  const workspace = getDemoWorkspace(params.novelSlug);

  if (!workspace) {
    notFound();
  }

  const firstChapter = workspace.chapters[0];
  const lengthProfile = getNovelLengthProfile(workspace.novel.lengthCategory);

  return (
    <div className="page-stack">
      <section className="workspace-hero">
        <div>
          <p className="panel-eyebrow">示例工作区</p>
          <h1>{workspace.novel.title}</h1>
          <p className="hero-text">{workspace.novel.summary ?? workspace.novel.premise}</p>
          <p className="assist-meta">这里只用于体验流程，不会写入你的真实项目。</p>
        </div>

        <div className="stack-column align-end">
          <div className="stats-inline">
            <span className="stat-pill">{workspace.novel.chapterCount} 章</span>
            <span className="stat-pill">{workspace.novel.wordCount} 字</span>
            <span className="stat-pill">{lengthProfile.label}</span>
            <span className="stat-pill">{workspace.novel.tone ?? "未定义语气"}</span>
          </div>
          <Link className="button-primary" href="/novels/new">
            我看懂了，现在新建自己的书
          </Link>
          {firstChapter ? (
            <Link className="button-secondary" href={`/demo/${workspace.novel.slug}/chapters/${firstChapter.slug}`}>
              进入示例写作页
            </Link>
          ) : null}
        </div>
      </section>

      <WorkspaceNav novelSlug={workspace.novel.slug} firstChapterSlug={firstChapter?.slug} basePath="/demo" />

      {children}
    </div>
  );
}
