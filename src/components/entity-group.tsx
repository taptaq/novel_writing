import type { StoryEntitySummary } from "@/types/domain";

interface EntityGroupProps {
  title: string;
  items: StoryEntitySummary[];
}

export function EntityGroup({ title, items }: EntityGroupProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="panel-eyebrow">{title}</p>
          <h2>{title}列表</h2>
        </div>
      </div>

      <div className="stack-column">
        {items.length > 0 ? (
          items.map((entity) => (
            <article key={entity.id} className="info-card">
              <div className="title-row">
                <h3>{entity.name}</h3>
                <span className="tag">{entity.type}</span>
              </div>
              <p>{entity.summary ?? "等待补充摘要"}</p>
              {entity.tags.length > 0 ? (
                <div className="tag-list">
                  {entity.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <p className="empty-state">还没补内容，先写最关键的几条就够了。</p>
        )}
      </div>
    </section>
  );
}
