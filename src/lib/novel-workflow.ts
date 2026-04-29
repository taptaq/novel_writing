export interface RecommendedNextStepInput {
  chapterCount: number;
  entityCount: number;
  outlineCount: number;
  firstChapterSlug?: string;
}

export interface RecommendedNextStep {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
}

export function getRecommendedNextStep({
  chapterCount,
  entityCount,
  outlineCount,
  firstChapterSlug
}: RecommendedNextStepInput): RecommendedNextStep {
  if (entityCount === 0) {
    return {
      title: "先补关键人物",
      description: "先把主角、对手和关键关系补齐，后面写章节才不容易空转。",
      href: "/world",
      actionLabel: "去补人物"
    };
  }

  if (outlineCount === 0) {
    return {
      title: "先整理前几章结构",
      description: "人物已经有了，先把开头几章的大致走向排出来，再开始写会更顺。",
      href: "/outline",
      actionLabel: "去整理大纲"
    };
  }

  if (chapterCount === 0) {
    return {
      title: "开始第一章",
      description: "人物和结构都已经打底，现在最值得先推进的是把第一章写出来。",
      href: "/outline",
      actionLabel: "去确认第一章"
    };
  }

  return {
    title: "继续推进下一章",
    description: "基础内容已经齐了，直接接着推进下一章，最能保持这本书的写作惯性。",
    href: firstChapterSlug ? `/chapters/${firstChapterSlug}` : "/outline",
    actionLabel: "去继续写"
  };
}
