import type { GraphScope } from "@/lib/graph-view";

const scopeLabels: Record<GraphScope, string> = {
  characters: "人物",
  "characters-factions": "人物 + 势力",
  all: "人物 + 势力 + 地点"
};

interface GraphFilterPanelProps {
  scope: GraphScope;
  scopes: GraphScope[];
  onScopeChange: (scope: GraphScope) => void;
  onExport: () => void;
  onReset: () => void;
}

export function GraphFilterPanel({
  scope,
  scopes,
  onScopeChange,
  onExport,
  onReset
}: GraphFilterPanelProps) {
  return (
    <aside className="graph-sidebar panel">
      <p className="panel-eyebrow">图谱筛选</p>
      <h2>人物图谱</h2>

      <div className="graph-scope-group">
        <p className="field-label">显示范围</p>
        {scopes.map((item) => (
          <button
            key={item}
            type="button"
            className={item === scope ? "mode-button mode-button-active" : "mode-button"}
            onClick={() => onScopeChange(item)}
          >
            {scopeLabels[item]}
          </button>
        ))}
      </div>

      <div className="graph-actions">
        <button type="button" className="button-primary" onClick={onExport}>
          导出当前关系图 PNG
        </button>
        <button type="button" className="button-secondary" onClick={onReset}>
          重置视图
        </button>
      </div>
    </aside>
  );
}
