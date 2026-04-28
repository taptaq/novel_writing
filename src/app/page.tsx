import Link from "next/link";
import { getNovelSummaries } from "@/lib/repositories/novels";
import { getNovelLengthProfile } from "@/lib/novel-length";

const statusCards = [
  {
    title: "结构",
    value: "节拍清晰",
    detail: "把大纲、章节目标和推进节奏放在同一视图里。"
  },
  {
    title: "设定",
    value: "映射完整",
    detail: "人物、地点与规则在正文推进时始终保持可追踪。"
  },
  {
    title: "写作",
    value: "上下文在线",
    detail: "把当前章节、上下文和语气护栏收进同一个操作面板。"
  }
];

const capabilityTags = ["结构建议", "设定映射", "上下文续写", "风格护栏"];
const featuredNovelSlug = "tide-and-embers";

export default async function HomePage() {
  const novels = await getNovelSummaries();
  const featuredNovel = novels.find((novel) => novel.slug === featuredNovelSlug);
  const fallbackNovel = novels[0];
  const primaryCta = featuredNovel
    ? {
        href: `/novels/${featuredNovel.slug}`,
        label: "进入示例工作区"
      }
    : fallbackNovel
      ? {
          href: `/novels/${fallbackNovel.slug}`,
          label: "继续最近项目"
        }
      : {
          href: "/novels",
          label: "查看作品"
        };

  return (
    <div className="page-stack landing-stack">
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="panel-eyebrow">Human Draft Studio</p>
          <h1>AI 协作写作，不替作者做决定。</h1>
          <p className="landing-summary">把结构、设定和章节推进收进同一个写作工作台。</p>
          <div className="action-row">
            <Link className="button-primary" href={primaryCta.href}>
              {primaryCta.label}
            </Link>
            <Link className="button-secondary" href="/novels">
              查看作品
            </Link>
          </div>
        </div>

        <div className="landing-status-grid">
          {statusCards.map((card) => (
            <article key={card.title} className="landing-status-card">
              <span className="landing-status-label">{card.title}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-capabilities">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">能力标签</p>
            <h2>把关键协作能力放在手边</h2>
          </div>
        </div>

        <div className="stats-inline">
          {capabilityTags.map((tag) => (
            <span key={tag} className="landing-capability-tag">
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section className="landing-projects">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">最近作品</p>
            <h2>继续推进你的项目</h2>
          </div>
        </div>

        <div className="landing-project-list">
          {novels.map((novel) => {
            const lengthProfile = getNovelLengthProfile(novel.lengthCategory);

            return (
              <Link key={novel.id} href={`/novels/${novel.slug}`} className="project-entry-card">
                <div className="project-entry-copy">
                  <h3>{novel.title}</h3>
                  <p>{novel.summary ?? novel.premise ?? "继续完善这部作品的设定与章节推进。"}</p>
                </div>
                <div className="stats-inline">
                  <span className="stat-pill">{novel.genre ?? "未分类"}</span>
                  <span className="stat-pill">{lengthProfile.label}</span>
                  <span className="stat-pill">{novel.chapterCount} 章</span>
                  <span className="stat-pill">{novel.wordCount} 字</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
