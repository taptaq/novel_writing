import { describe, expect, it } from "vitest";
import { buildGraphCanvasDefinition } from "@/components/graph-canvas";
import type { NovelGraphData } from "@/types/domain";

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
  nodes: [
    { id: "c1", name: "祝衡", type: "CHARACTER", summary: "档案修复师", tags: [] },
    { id: "f1", name: "城档馆", type: "FACTION", summary: "档案机构", tags: [] }
  ],
  edges: [{ id: "e1", sourceId: "c1", targetId: "f1", type: "OTHER", description: "隶属关系" }]
};

describe("buildGraphCanvasDefinition", () => {
  it("disables node dragging while preserving a pannable graph canvas", () => {
    const definition = buildGraphCanvasDefinition(graph);

    expect(definition.autoungrabify).toBe(true);
    expect(definition.userPanningEnabled).toBe(true);
    expect(definition.userZoomingEnabled).toBe(true);
  });

  it("builds node and edge elements from graph data", () => {
    const definition = buildGraphCanvasDefinition(graph);

    expect(definition.elements).toEqual([
      {
        data: {
          id: "c1",
          label: "祝衡",
          type: "CHARACTER"
        }
      },
      {
        data: {
          id: "f1",
          label: "城档馆",
          type: "FACTION"
        }
      },
      {
        data: {
          id: "e1",
          source: "c1",
          target: "f1",
          type: "OTHER"
        }
      }
    ]);
  });
});
