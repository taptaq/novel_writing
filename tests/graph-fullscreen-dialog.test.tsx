import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { GraphDetailState } from "@/lib/graph-view";
import { GraphFullscreenDialog } from "@/components/graph-fullscreen-dialog";

globalThis.React = React;

const overviewDetail: GraphDetailState = {
  kind: "overview",
  counts: {
    nodes: 4,
    edges: 3
  },
  node: undefined,
  relations: []
};

const nodeDetail: GraphDetailState = {
  kind: "node",
  counts: {
    nodes: 4,
    edges: 3
  },
  node: {
    id: "c1",
    name: "祝衡",
    type: "CHARACTER",
    summary: "档案修复师",
    tags: []
  },
  relations: [
    {
      edge: {
        id: "e1",
        sourceId: "c1",
        targetId: "f1",
        type: "OTHER",
        description: "隶属关系"
      },
      target: {
        id: "f1",
        name: "城档馆",
        type: "FACTION",
        summary: "档案机构",
        tags: []
      }
    }
  ]
};

describe("GraphFullscreenDialog", () => {
  it("renders the info bar and close control when open", () => {
    const markup = renderToStaticMarkup(
      <GraphFullscreenDialog
        isOpen
        title="玻璃城遗闻"
        scopeLabel="人物 + 势力"
        selectedNodeName={undefined}
        detail={overviewDetail}
        onClose={() => undefined}
      >
        <div>关系图画布</div>
      </GraphFullscreenDialog>
    );

    expect(markup).toContain("滚轮缩放，拖动画布移动，点击节点查看关系");
    expect(markup).toContain("人物 + 势力");
    expect(markup).toContain("关闭");
  });

  it("does not render anything when closed", () => {
    const markup = renderToStaticMarkup(
      <GraphFullscreenDialog
        isOpen={false}
        title="玻璃城遗闻"
        scopeLabel="人物"
        selectedNodeName={undefined}
        detail={overviewDetail}
        onClose={() => undefined}
      >
        <div>关系图画布</div>
      </GraphFullscreenDialog>
    );

    expect(markup).toBe("");
  });

  it("renders the lightweight detail card when a node is selected", () => {
    const markup = renderToStaticMarkup(
      <GraphFullscreenDialog
        isOpen
        title="玻璃城遗闻"
        scopeLabel="人物"
        selectedNodeName="祝衡"
        detail={nodeDetail}
        onClose={() => undefined}
      >
        <div>关系图画布</div>
      </GraphFullscreenDialog>
    );

    expect(markup).toContain("祝衡");
    expect(markup).toContain("档案修复师");
    expect(markup).toContain("城档馆");
  });
});
