"use client";

import { useMemo, useRef, useState } from "react";
import type { Core } from "cytoscape";
import {
  buildGraphDetailState,
  filterGraphByScope,
  getAvailableGraphScopes,
  getDefaultGraphScope
} from "@/lib/graph-view";
import type { NovelGraphData } from "@/types/domain";
import { buildGraphExportFilename } from "@/lib/graph-export";
import { GraphCanvas } from "@/components/graph-canvas";
import { GraphDetailPanel } from "@/components/graph-detail-panel";
import { GraphFilterPanel } from "@/components/graph-filter-panel";
import { GraphFullscreenDialog } from "@/components/graph-fullscreen-dialog";

interface GraphWorkspaceProps {
  graph: NovelGraphData;
}

const scopeLabels = {
  characters: "人物",
  "characters-factions": "人物 + 势力",
  all: "人物 + 势力 + 地点"
} as const;

export function GraphWorkspace({ graph }: GraphWorkspaceProps) {
  const [scope, setScope] = useState(() => getDefaultGraphScope(graph));
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const coreRef = useRef<Core | null>(null);

  const scopes = useMemo(() => getAvailableGraphScopes(graph), [graph]);
  const filteredGraph = useMemo(() => filterGraphByScope(graph, scope), [graph, scope]);
  const detail = useMemo(
    () => buildGraphDetailState(filteredGraph, selectedNodeId),
    [filteredGraph, selectedNodeId]
  );
  const selectedNodeName = detail.kind === "node" ? detail.node.name : undefined;

  function handleExport() {
    if (!coreRef.current || typeof document === "undefined") {
      return;
    }

    const dataUrl = coreRef.current.png({
      full: false,
      bg: "#f6efe5",
      scale: 2
    });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = buildGraphExportFilename(graph.novel.slug, scope);
    link.click();
  }

  function handleReset() {
    setSelectedNodeId(undefined);
    coreRef.current?.fit();
    coreRef.current?.center();
  }

  return (
    <div className="graph-shell">
      <GraphFilterPanel
        scope={scope}
        scopes={scopes}
        onScopeChange={(nextScope) => {
          setScope(nextScope);
          setSelectedNodeId(undefined);
        }}
        onExport={handleExport}
        onReset={handleReset}
      />

      <section className="graph-canvas panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">关系画布</p>
            <h2>{graph.novel.title}</h2>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setIsFullscreenOpen(true)}
          >
            放大查看
          </button>
        </div>

        <GraphCanvas
          graph={filteredGraph}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onReady={(core) => {
            coreRef.current = core;
          }}
        />
      </section>

      <GraphDetailPanel detail={detail} />

      <GraphFullscreenDialog
        isOpen={isFullscreenOpen}
        title={graph.novel.title}
        scopeLabel={scopeLabels[scope]}
        selectedNodeName={selectedNodeName}
        detail={detail}
        onClose={() => setIsFullscreenOpen(false)}
      >
        <GraphCanvas
          graph={filteredGraph}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />
      </GraphFullscreenDialog>
    </div>
  );
}
