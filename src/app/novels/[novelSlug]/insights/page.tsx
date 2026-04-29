import { notFound } from "next/navigation";
import { getNovelWorkspace } from "@/lib/repositories/novels";
import { writingSkillPresets } from "@/lib/novel-writing-skills";
import { getLengthFeatureHints, getNovelLengthProfile } from "@/lib/novel-length";

const aiLanes = [
  "普通任务先用轻一点的模型，真的复杂了再切高配。",
  "AI 生成的内容先当草稿看，确认能用再正式采纳。",
  "优先查设定卡、章节摘要和伏笔，不要把整本正文一股脑塞进去。"
];

export default async function InsightsPage({ params }: { params: { novelSlug: string } }) {
  const workspace = await getNovelWorkspace(params.novelSlug);

  if (!workspace) {
    notFound();
  }

  const lengthProfile = getNovelLengthProfile(workspace.novel.lengthCategory);
  const lengthHints = getLengthFeatureHints(workspace.novel.lengthCategory);

  return (
    <div className="dashboard-grid insights-grid">
      <section className="panel insight-card">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">这本书现在更该盯什么</p>
            <h2>{lengthProfile.label}</h2>
          </div>
        </div>

        <div className="insight-body">
          <p className="insight-lead">按这本书现在的篇幅，先优先关注这些地方。</p>
          <p className="muted-text">{lengthProfile.structureHint}</p>
        </div>
        <div className="tag-list">
          <span className="tag">图谱 {lengthProfile.moduleMode.graph}</span>
          <span className="tag">大纲 {lengthProfile.moduleMode.outline}</span>
          <span className="tag">伏笔 {lengthProfile.moduleMode.foreshadow}</span>
          <span className="tag">资料 {lengthProfile.moduleMode.research}</span>
        </div>
      </section>

      <section className="panel insight-card">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">AI 怎么配合你</p>
            <h2>默认做法</h2>
          </div>
        </div>

        <p className="insight-lead">不知道怎么配模型时，先按这套来。</p>
        <ul className="plain-list">
          {aiLanes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel insight-card">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">这本书的写法提醒</p>
            <h2>先守住这些感觉</h2>
          </div>
        </div>

        <p className="insight-lead">这些会优先约束续写和润色，省得你每次重讲一遍。</p>
        <ul className="plain-list">
          {workspace.voiceRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section className="panel panel-wide insight-wide">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">不同篇幅，不同重点</p>
            <h2>现在这些功能更值得用</h2>
          </div>
        </div>

        <p className="insight-section-intro">不是每个模块都要重度使用，先盯住当前最有用的。</p>
        <ul className="plain-list">
          {lengthHints.map((hint) => (
            <li key={hint}>{hint}</li>
          ))}
        </ul>
      </section>

      <section className="panel panel-wide insight-wide insight-skill-section">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">这些功能什么时候用</p>
            <h2>卡住了就按这个选</h2>
          </div>
        </div>

        <p className="insight-section-intro insight-skill-copy">
          不用背术语，按你现在遇到的问题来点就行。
        </p>
        <div className="skill-grid insight-skill-grid">
          {writingSkillPresets.map((preset) => (
            <article key={preset.id} className="skill-preset-card insight-skill-card">
              <div className="insight-skill-head">
                <p className="field-label">{preset.sourceName}</p>
                <h3>{preset.name}</h3>
                <p className="insight-skill-summary">{preset.summary}</p>
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
