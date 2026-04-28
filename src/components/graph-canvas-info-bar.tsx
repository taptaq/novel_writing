interface GraphCanvasInfoBarProps {
  title: string;
  scopeLabel: string;
  selectedNodeName?: string;
  onClose?: () => void;
}

export function GraphCanvasInfoBar({
  title,
  scopeLabel,
  selectedNodeName,
  onClose
}: GraphCanvasInfoBarProps) {
  return (
    <div className="graph-fullscreen-info-bar">
      <div className="graph-fullscreen-info-copy">
        <strong>{title}</strong>
        <span>{scopeLabel}</span>
        {selectedNodeName ? <span>当前选中：{selectedNodeName}</span> : null}
        <span>滚轮缩放，拖动画布移动，点击节点查看关系</span>
      </div>

      {onClose ? (
        <button type="button" className="button-secondary" onClick={onClose}>
          关闭
        </button>
      ) : null}
    </div>
  );
}
