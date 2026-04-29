import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GraphPage from "@/app/novels/[novelSlug]/graph/page";

globalThis.React = React;

vi.mock("@/lib/repositories/novels", () => ({
  getNovelGraphData: vi.fn(async () => ({
    novel: {
      id: "novel-1",
      slug: "glass-citadel",
      title: "玻璃城遗闻",
      premise: "一位档案修复师在倒塌前的玻璃城里寻找失踪姐姐留下的第二份遗嘱。",
      status: "PLANNING",
      updatedAt: new Date("2026-04-26T00:00:00.000Z").toISOString(),
      chapterCount: 0,
      wordCount: 0
    },
    nodes: [
      { id: "c1", name: "祝衡", type: "CHARACTER", summary: "档案修复师", tags: [] },
      { id: "f1", name: "城档馆", type: "FACTION", summary: "城市档案机构", tags: [] },
      { id: "l1", name: "下城档案塔", type: "LOCATION", summary: "祝衡工作的地方", tags: [] }
    ],
    edges: [{ id: "e1", sourceId: "c1", targetId: "f1", type: "OTHER", description: "隶属关系" }]
  }))
}));

describe("GraphPage", () => {
  it("renders the graph workspace shell", async () => {
    const markup = renderToStaticMarkup(await GraphPage({ params: { novelSlug: "glass-citadel" } }));

    expect(markup).toContain("一眼看清人物关系");
    expect(markup).toContain("导出这张关系图");
    expect(markup).toContain("先点一个人物看看关系");
    expect(markup).toContain("关系图画布");
  });
});
