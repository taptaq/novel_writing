import { notFound } from "next/navigation";
import { getNovelWorkspace } from "@/lib/repositories/novels";
import { writingSkillPresets } from "@/lib/novel-writing-skills";
import { getLengthFeatureHints, getNovelLengthProfile } from "@/lib/novel-length";

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

  const lengthProfile = getNovelLengthProfile(workspace.novel.lengthCategory);
  const lengthHints = getLengthFeatureHints(workspace.novel.lengthCategory);

  return (
    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">篇幅策略</p>
            <h2>{lengthProfile.label}</h2>
          </div>
        </div>

        <p className="muted-text">{lengthProfile.structureHint}</p>
        <div className="tag-list">
          <span className="tag">图谱 {lengthProfile.moduleMode.graph}</span>
          <span className="tag">大纲 {lengthProfile.moduleMode.outline}</span>
          <span className="tag">伏笔 {lengthProfile.moduleMode.foreshadow}</span>
          <span className="tag">资料 {lengthProfile.moduleMode.research}</span>
        </div>
      </section>

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
            <p className="panel-eyebrow">动态功能建议</p>
            <h2>按篇幅调整工作区</h2>
          </div>
        </div>

        <ul className="plain-list">
          {lengthHints.map((hint) => (
            <li key={hint}>{hint}</li>
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
