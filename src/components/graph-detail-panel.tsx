import type { GraphDetailState } from "@/lib/graph-view";

interface GraphDetailPanelProps {
  detail: GraphDetailState;
}

export function GraphDetailPanel({ detail }: GraphDetailPanelProps) {
  if (detail.kind === "overview") {
    return (
      <aside className="graph-detail panel">
        <p className="panel-eyebrow">关系详情</p>
        <h2>先点一个人物看看关系</h2>
        <ul className="plain-list compact-list">
          <li>节点数 · {detail.counts.nodes}</li>
          <li>关系数 · {detail.counts.edges}</li>
        </ul>
      </aside>
    );
  }

  return (
    <aside className="graph-detail panel">
      <p className="panel-eyebrow">关系详情</p>
      <h2>{detail.node.name}</h2>
      <p>{detail.node.summary ?? "这条人物卡还没补说明。"}</p>
      <ul className="plain-list compact-list">
        {detail.relations.map((item) => (
          <li key={item.edge.id}>
            <strong>{item.target.name}</strong>
            {item.edge.description ? ` · ${item.edge.description}` : ` · ${item.edge.type}`}
            {item.edge.remark ? ` · 备注：${item.edge.remark}` : ""}
            {item.edge.note ? ` · 说明：${item.edge.note}` : ""}
          </li>
        ))}
      </ul>
    </aside>
  );
}
