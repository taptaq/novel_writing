import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getNovelWorkspace,
  isNovelWorkspaceRepositoryError
} from "@/lib/repositories/novels";
import { decodeRouteParam } from "@/lib/route-params";
import { WorkspaceNav } from "@/components/workspace-nav";
import { getNovelLengthProfile } from "@/lib/novel-length";

export default async function NovelWorkspaceLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { novelSlug: string };
}) {
  const novelSlug = decodeRouteParam(params.novelSlug);
  let workspace;

  try {
    workspace = await getNovelWorkspace(novelSlug);
  } catch (error) {
    if (isNovelWorkspaceRepositoryError(error)) {
      return (
        <div className="page-stack">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">工作区读取失败</p>
                <h1>工作区暂时没读出来</h1>
              </div>
            </div>
            <p className="hero-text">这本书能在列表里看到，但进入工作区时没拿到完整数据。</p>
            <p className="assist-meta">
              现在更像是数据读取或数据库结构不兼容，不是这本书真的不存在。
            </p>
            <div className="action-row">
              <Link className="button-primary" href="/novels">
                先回作品列表
              </Link>
              <Link className="button-secondary" href="/novels/new">
                重新新建一本
              </Link>
            </div>
          </section>
        </div>
      );
    }

    throw error;
  }

  if (!workspace) {
    notFound();
  }

  const firstChapter = workspace.chapters[0];
  const lengthProfile = getNovelLengthProfile(workspace.novel.lengthCategory);

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
            <span className="stat-pill">{lengthProfile.label}</span>
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
