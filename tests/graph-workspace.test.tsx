import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GraphWorkspace } from "@/components/graph-workspace";
import type { NovelGraphData } from "@/types/domain";

globalThis.React = React;

const graph: NovelGraphData = {
  novel: {
    id: "novel-1",
    slug: "glass-citadel",
    title: "玻璃城遗闻",
    status: "PLANNING",
    updatedAt: "2026-04-27T00:00:00.000Z",
    chapterCount: 0,
    wordCount: 0
  },
  nodes: [{ id: "c1", name: "祝衡", type: "CHARACTER", summary: "档案修复师", tags: [] }],
  edges: []
};

describe("GraphWorkspace", () => {
  it("renders scope controls and export action", () => {
    const markup = renderToStaticMarkup(<GraphWorkspace graph={graph} />);

    expect(markup).toContain("显示范围");
    expect(markup).toContain("人物");
    expect(markup).toContain("导出当前关系图 PNG");
  });

  it("renders overview state before any node is selected", () => {
    const markup = renderToStaticMarkup(<GraphWorkspace graph={graph} />);

    expect(markup).toContain("当前图谱概览");
    expect(markup).toContain("节点数");
  });

  it("renders reset action and labels for all graph scopes", () => {
    const markup = renderToStaticMarkup(<GraphWorkspace graph={graph} />);

    expect(markup).toContain("人物 + 势力");
    expect(markup).toContain("人物 + 势力 + 地点");
    expect(markup).toContain("重置视图");
    expect(markup).toContain("关系图画布");
  });

  it("renders the fullscreen viewing entry", () => {
    const markup = renderToStaticMarkup(<GraphWorkspace graph={graph} />);

    expect(markup).toContain("放大查看");
  });
});
