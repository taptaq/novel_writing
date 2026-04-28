import type { GraphEdgeSummary, GraphNodeSummary, NovelGraphData } from "@/types/domain";

export type GraphScope = "characters" | "characters-factions" | "all";

export type GraphOverviewDetailState = {
  kind: "overview";
  counts: {
    nodes: number;
    edges: number;
  };
  node: undefined;
  relations: [];
};

export type GraphNodeRelation = {
  edge: GraphEdgeSummary;
  target: GraphNodeSummary;
};

export type GraphNodeDetailState = {
  kind: "node";
  counts: {
    nodes: number;
    edges: number;
  };
  node: GraphNodeSummary;
  relations: GraphNodeRelation[];
};

export type GraphDetailState = GraphOverviewDetailState | GraphNodeDetailState;

const scopeEntityTypes: Record<GraphScope, GraphNodeSummary["type"][]> = {
  characters: ["CHARACTER"],
  "characters-factions": ["CHARACTER", "FACTION"],
  all: ["CHARACTER", "FACTION", "LOCATION"]
};

function buildOverviewDetailState(graph: NovelGraphData): GraphOverviewDetailState {
  return {
    kind: "overview",
    counts: {
      nodes: graph.nodes.length,
      edges: graph.edges.length
    },
    node: undefined,
    relations: []
  };
}

export function getAvailableGraphScopes(graph: NovelGraphData): GraphScope[] {
  const nodeTypes = new Set(graph.nodes.map((node) => node.type));

  if (nodeTypes.size === 0) {
    return ["characters", "characters-factions", "all"];
  }

  const scopes: GraphScope[] = [];

  if (nodeTypes.has("CHARACTER")) {
    scopes.push("characters");
  }

  if (nodeTypes.has("CHARACTER") || nodeTypes.has("FACTION")) {
    scopes.push("characters-factions");
  }

  if (nodeTypes.has("CHARACTER") || nodeTypes.has("FACTION") || nodeTypes.has("LOCATION")) {
    scopes.push("all");
  }

  return scopes;
}

export function getDefaultGraphScope(graph: NovelGraphData): GraphScope {
  return graph.nodes.some((node) => node.type === "CHARACTER") ? "characters" : "all";
}

export function filterGraphByScope(graph: NovelGraphData, scope: GraphScope): NovelGraphData {
  const allowedTypes = new Set(scopeEntityTypes[scope]);
  const nodes = graph.nodes.filter((node) => allowedTypes.has(node.type));
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter(
    (edge) => visibleNodeIds.has(edge.sourceId) && visibleNodeIds.has(edge.targetId)
  );

  return {
    ...graph,
    nodes,
    edges
  };
}

export function buildGraphDetailState(
  graph: NovelGraphData,
  selectedNodeId?: string
): GraphDetailState {
  if (!selectedNodeId) {
    return buildOverviewDetailState(graph);
  }

  const node = graph.nodes.find((item) => item.id === selectedNodeId);

  if (!node) {
    return buildOverviewDetailState(graph);
  }

  const nodeById = new Map(graph.nodes.map((item) => [item.id, item]));
  const relations = graph.edges
    .filter((edge) => edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId)
    .map((edge) => {
      const targetId = edge.sourceId === selectedNodeId ? edge.targetId : edge.sourceId;
      const target = nodeById.get(targetId);

      if (!target) {
        return null;
      }

      return {
        edge,
        target
      };
    })
    .filter((item): item is GraphNodeRelation => Boolean(item));

  return {
    kind: "node",
    counts: {
      nodes: graph.nodes.length,
      edges: graph.edges.length
    },
    node,
    relations
  };
}
