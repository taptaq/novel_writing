import { notFound } from "next/navigation";
import { getNovelWorkspace } from "@/lib/repositories/novels";
import { writingSkillPresets } from "@/lib/novel-writing-skills";

const aiLanes = [
  "普通任务优先走轻模型，结构重写和长上下文审看再切高配模型。",
  "所有生成文本默认视为候选稿，作者手动采纳后才落盘。",
  "向量召回优先检索设定卡、章节摘要和伏笔，而不是整本正文硬塞。"
];

export default async function InsightsPage({ params }: { params: { novelSlug: string } }) {
  const workspace = await getNovelWorkspace(params.novelSlug);

  if (!workspace) {
    notFound();
  }

  return (
    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">AI 工作流</p>
            <h2>默认策略</h2>
          </div>
        </div>

        <ul className="plain-list">
          {aiLanes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">作品护栏</p>
            <h2>这本书的风格规则</h2>
          </div>
        </div>

        <ul className="plain-list">
          {workspace.voiceRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section className="panel panel-wide">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">写作技能</p>
            <h2>已融合的创作工作流</h2>
          </div>
        </div>

        <div className="skill-grid">
          {writingSkillPresets.map((preset) => (
            <article key={preset.id} className="skill-preset-card">
              <div>
                <p className="field-label">{preset.sourceName}</p>
                <h3>{preset.name}</h3>
                <p>{preset.summary}</p>
              </div>
              <div className="tag-list">
                {preset.focus.map((item) => (
                  <span key={item} className="tag">
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
