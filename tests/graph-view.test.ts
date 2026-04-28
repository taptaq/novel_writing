import { describe, expect, it } from "vitest";
import {
  buildGraphDetailState,
  filterGraphByScope,
  getAvailableGraphScopes,
  getDefaultGraphScope
} from "@/lib/graph-view";
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
    { id: "c2", name: "姐姐", type: "CHARACTER", summary: "失踪亲属", tags: [] },
    { id: "f1", name: "城档馆", type: "FACTION", summary: "档案机构", tags: [] },
    { id: "l1", name: "下城档案塔", type: "LOCATION", summary: "工作地点", tags: [] }
  ],
  edges: [
    { id: "e1", sourceId: "c1", targetId: "c2", type: "FAMILY", description: "姐妹关系" },
    { id: "e2", sourceId: "c1", targetId: "f1", type: "OTHER", description: "隶属关系" },
    { id: "e3", sourceId: "c1", targetId: "l1", type: "ROOTED_IN", description: "工作地点" }
  ]
};

describe("graph-view", () => {
  it("returns all supported scopes for mixed graph entities", () => {
    expect(getAvailableGraphScopes(graph)).toEqual([
      "characters",
      "characters-factions",
      "all"
    ]);
  });

  it("defaults to character scope when characters exist", () => {
    expect(getDefaultGraphScope(graph)).toBe("characters");
  });

  it("filters graph to characters only", () => {
    const filtered = filterGraphByScope(graph, "characters");

    expect(filtered.nodes.map((node) => node.name)).toEqual(["祝衡", "姐姐"]);
    expect(filtered.edges.map((edge) => edge.id)).toEqual(["e1"]);
  });

  it("filters graph to characters and factions", () => {
    const filtered = filterGraphByScope(graph, "characters-factions");

    expect(filtered.nodes.map((node) => node.name)).toEqual(["祝衡", "姐姐", "城档馆"]);
    expect(filtered.edges.map((edge) => edge.id)).toEqual(["e1", "e2"]);
  });

  it("builds overview detail state when nothing is selected", () => {
    expect(buildGraphDetailState(graph)).toEqual({
      kind: "overview",
      counts: {
        nodes: 4,
        edges: 3
      },
      node: undefined,
      relations: []
    });
  });

  it("builds selected-node detail state with direct relations", () => {
    const filtered = filterGraphByScope(graph, "all");
    const detail = buildGraphDetailState(filtered, "c1");

    expect(detail.kind).toBe("node");
    expect(detail.node?.name).toBe("祝衡");
    expect(detail.relations.map((item) => item.target.name)).toEqual([
      "姐姐",
      "城档馆",
      "下城档案塔"
    ]);
    expect(detail.relations.map((item) => item.edge.id)).toEqual(["e1", "e2", "e3"]);
  });

  it("falls back to all scope when there are no character nodes", () => {
    const factionOnlyGraph: NovelGraphData = {
      ...graph,
      nodes: [{ id: "f1", name: "城档馆", type: "FACTION", summary: "档案机构", tags: [] }],
      edges: []
    };

    expect(getAvailableGraphScopes(factionOnlyGraph)).toEqual(["characters-factions", "all"]);
    expect(getDefaultGraphScope(factionOnlyGraph)).toBe("all");
  });

  it("returns all scopes for an empty graph to keep the UI stable", () => {
    const emptyGraph: NovelGraphData = {
      ...graph,
      nodes: [],
      edges: []
    };

    expect(getAvailableGraphScopes(emptyGraph)).toEqual([
      "characters",
      "characters-factions",
      "all"
    ]);
    expect(getDefaultGraphScope(emptyGraph)).toBe("all");
  });

  it("returns overview when a previously selected node is hidden by filtering", () => {
    const filtered = filterGraphByScope(graph, "characters");

    expect(buildGraphDetailState(filtered, "f1")).toEqual({
      kind: "overview",
      counts: {
        nodes: 2,
        edges: 1
      },
      node: undefined,
      relations: []
    });
  });

  it("drops dangling relations that point to missing nodes", () => {
    const danglingGraph: NovelGraphData = {
      ...graph,
      edges: [
        ...graph.edges,
        {
          id: "e4",
          sourceId: "c1",
          targetId: "missing-node",
          type: "OTHER",
          description: "坏数据"
        }
      ]
    };

    const detail = buildGraphDetailState(danglingGraph, "c1");

    expect(detail.kind).toBe("node");
    expect(detail.relations.map((item) => item.edge.id)).toEqual(["e1", "e2", "e3"]);
  });
});
