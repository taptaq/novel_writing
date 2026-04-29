import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import DemoWorkspaceLayout from "@/app/demo/[novelSlug]/layout";

globalThis.React = React;

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("@/lib/demo-data", () => ({
  getDemoWorkspace: vi.fn(() => ({
    novel: {
      id: "novel-tide-and-embers",
      slug: "tide-and-embers",
      title: "潮汐灰烬",
      premise: "一座靠潮汐钟维持秩序的港城，在钟声失准后开始吞没记忆。",
      summary: "这是一个示例项目，用来带你熟悉从设定到写作的完整流程。",
      genre: "悬疑 / 都市奇幻",
      tone: "克制、贴地、慢热推进",
      lengthCategory: "MEDIUM",
      status: "DRAFTING",
      updatedAt: "2026-04-26T09:00:00.000Z",
      chapterCount: 2,
      wordCount: 443
    },
    voiceRules: [],
    chapters: [
      {
        id: "chapter-storm-signal",
        slug: "storm-signal",
        title: "第 1 章 风暴前的报时",
        order: 1,
        status: "DRAFT",
        wordCount: 222
      }
    ],
    entities: [],
    outlines: [],
    foreshadows: []
  }))
}));

vi.mock("@/components/workspace-nav", () => ({
  WorkspaceNav: ({ novelSlug }: { novelSlug: string }) => <div>WorkspaceNav:{novelSlug}</div>
}));

describe("DemoWorkspaceLayout", () => {
  it("shows a clear demo-only notice in the workspace header", () => {
    const markup = renderToStaticMarkup(
      <DemoWorkspaceLayout params={{ novelSlug: "tide-and-embers" }}>
        <div>Demo body</div>
      </DemoWorkspaceLayout>
    );

    expect(markup).toContain("示例工作区");
    expect(markup).toContain("只用于体验流程");
    expect(markup).toContain("不会写入你的真实项目");
    expect(markup).toContain("我看懂了，现在新建自己的书");
    expect(markup).toContain('href="/novels/new"');
  });
});
