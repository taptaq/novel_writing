import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import WorldPage from "@/app/novels/[novelSlug]/world/page";

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

vi.mock("@/lib/repositories/novels", () => ({
  getNovelWorkspace: vi.fn(async () => ({
    novel: {
      id: "novel-1",
      slug: "glass-city",
      title: "玻璃城遗闻",
      premise: "她要从玻璃废墟里找回姐姐留下的第二份遗嘱。",
      status: "DRAFTING",
      updatedAt: "2026-04-27T00:00:00.000Z",
      chapterCount: 12,
      wordCount: 54000
    },
    entities: [
      {
        id: "entity-1",
        type: "CHARACTER",
        name: "祝衡",
        summary: "档案修复师",
        tags: []
      }
    ],
    voiceRules: [],
    chapters: [],
    outlines: [],
    foreshadows: []
  })),
  getNovelGraphData: vi.fn(async () => ({
    novel: {
      id: "novel-1",
      slug: "glass-city",
      title: "玻璃城遗闻",
      premise: "她要从玻璃废墟里找回姐姐留下的第二份遗嘱。",
      status: "DRAFTING",
      updatedAt: "2026-04-27T00:00:00.000Z",
      chapterCount: 12,
      wordCount: 54000
    },
    nodes: [
      {
        id: "entity-1",
        name: "祝衡",
        type: "CHARACTER",
        summary: "档案修复师",
        tags: []
      }
    ],
    edges: []
  }))
}));

describe("WorldPage", () => {
  it("renders merged settings and relationship guidance in one page", async () => {
    const markup = renderToStaticMarkup(await WorldPage({ params: { novelSlug: "glass-city" } }));

    expect(markup).toContain("设定与关系");
    expect(markup).toContain("忘了谁是谁，就回这里看。");
    expect(markup).toContain("设定卡");
    expect(markup).toContain("关系图");
    expect(markup).toContain("一页看完设定和关系。");
    expect(markup).toContain("人物列表");
    expect(markup).toContain("祝衡");
    expect(markup).toContain("一眼看清人物关系");
    expect(markup).toContain("导出这张关系图");
  });
});
