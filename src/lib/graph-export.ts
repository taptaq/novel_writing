import type { GraphScope } from "@/lib/graph-view";

const graphScopeLabels: Record<GraphScope, string> = {
  characters: "人物",
  "characters-factions": "人物 + 势力",
  all: "人物 + 势力 + 地点"
};

export function buildGraphExportFilename(slug: string, scope: GraphScope, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  return `${slug}-${scope}-${date}.png`;
}

export function getGraphExportLabel(title: string, scope: GraphScope, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  return `${title} · ${graphScopeLabels[scope]} · ${date}`;
}
