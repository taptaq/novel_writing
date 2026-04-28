"use client";

import { useEffect, useRef } from "react";
import cytoscape, { type Core, type StylesheetJson } from "cytoscape";
import type { NovelGraphData } from "@/types/domain";

interface GraphCanvasProps {
  graph: NovelGraphData;
  selectedNodeId?: string;
  onSelectNode: (nodeId?: string) => void;
  onReady?: (core: Core) => void;
}

export function buildGraphCanvasDefinition(graph: NovelGraphData) {
  const elements = [
    ...graph.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.name,
        type: node.type
      }
    })),
    ...graph.edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.sourceId,
        target: edge.targetId,
        type: edge.type
      }
    }))
  ];

  const style: StylesheetJson = [
    {
      selector: "node",
      style: {
        label: "data(label)",
        "background-color": "#d9c3a5",
        color: "#3b2b1b",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": 12,
        width: 54,
        height: 54,
        "text-wrap": "wrap",
        "text-max-width": "72px"
      }
    },
    {
      selector: 'node[type = "CHARACTER"]',
      style: {
        "background-color": "#20324a",
        color: "#ffffff"
      }
    },
    {
      selector: 'node[type = "FACTION"]',
      style: {
        "background-color": "#c9782a",
        color: "#ffffff"
      }
    },
    {
      selector: 'node[type = "LOCATION"]',
      style: {
        "background-color": "#4f6a59",
        color: "#ffffff"
      }
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "line-color": "#ccb192",
        "target-arrow-color": "#ccb192",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier"
      }
    },
    {
      selector: ".dimmed",
      style: {
        opacity: 0.18
      }
    },
    {
      selector: ".focused",
      style: {
        opacity: 1,
        "line-color": "#c9782a",
        "target-arrow-color": "#c9782a",
        "border-width": 3,
        "border-color": "#f5d4aa"
      }
    }
  ];

  return {
    elements,
    layout: {
      name: "cose" as const,
      animate: false,
      fit: true,
      padding: 28
    },
    style,
    autoungrabify: true,
    userPanningEnabled: true,
    userZoomingEnabled: true
  };
}

export function GraphCanvas({
  graph,
  selectedNodeId,
  onSelectNode,
  onReady
}: GraphCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const coreRef = useRef<Core | null>(null);
  const onReadyRef = useRef(onReady);
  const onSelectNodeRef = useRef(onSelectNode);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    onSelectNodeRef.current = onSelectNode;
  }, [onSelectNode]);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    hostRef.current.textContent = "";
    const definition = buildGraphCanvasDefinition(graph);

    const core = cytoscape({
      container: hostRef.current,
      ...definition
    });

    core.on("tap", "node", (event) => {
      onSelectNodeRef.current(event.target.id());
    });

    core.on("tap", (event) => {
      if (event.target === core) {
        onSelectNodeRef.current(undefined);
      }
    });

    coreRef.current = core;
    onReadyRef.current?.(core);

    return () => {
      core.destroy();
      coreRef.current = null;
    };
  }, [graph]);

  useEffect(() => {
    const core = coreRef.current;

    if (!core) {
      return;
    }

    core.elements().removeClass("dimmed focused");

    if (!selectedNodeId) {
      return;
    }

    const selected = core.getElementById(selectedNodeId);

    if (!selected || selected.empty()) {
      return;
    }

    const neighborhood = selected.closedNeighborhood();
    core.elements().difference(neighborhood).addClass("dimmed");
    neighborhood.addClass("focused");
  }, [selectedNodeId]);

  return (
    <div ref={hostRef} className="graph-canvas-stage" aria-label="关系图画布">
      关系图画布
    </div>
  );
}
