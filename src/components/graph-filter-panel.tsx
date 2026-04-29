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
      <p className="panel-eyebrow">关系图</p>
      <h2>一眼看清人物关系</h2>
      <p className="assist-meta">点一个人物，就能看他和谁有关。</p>

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
          导出这张关系图
        </button>
        <button type="button" className="button-secondary" onClick={onReset}>
          回到初始视角
        </button>
      </div>
    </aside>
  );
}
