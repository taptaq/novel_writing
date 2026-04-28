import type { NovelLengthCategory } from "@/types/domain";

export type NovelLengthProfile = {
  value: NovelLengthCategory;
  label: string;
  description: string;
  defaultChapterCount: number;
  defaultWordsPerChapter: number;
  structureHint: string;
  moduleMode: {
    graph: string;
    outline: string;
    foreshadow: string;
    research: string;
    style: string;
  };
  featureHints: string[];
};

export const novelLengthOptions: NovelLengthProfile[] = [
  {
    value: "SHORT",
    label: "短篇",
    description: "适合单一核心事件、少量人物和高密度转折。",
    defaultChapterCount: 6,
    defaultWordsPerChapter: 2500,
    structureHint: "建议用起承转合或三幕短结构，尽快进入冲突。",
    moduleMode: {
      graph: "轻量",
      outline: "关键节点",
      foreshadow: "少量精准",
      research: "按需查询",
      style: "强风格统一"
    },
    featureHints: [
      "人物图谱建议只保留主角、对手和关键关系。",
      "伏笔控制在少量精准，不建议铺太多支线。",
      "资料检索以能立刻进入场景的细节为主。"
    ]
  },
  {
    value: "MEDIUM",
    label: "中篇",
    description: "适合一条主线加一到两条副线，人物和设定有展开空间。",
    defaultChapterCount: 18,
    defaultWordsPerChapter: 3000,
    structureHint: "建议用三幕结构或节拍表，把中段转折提前规划。",
    moduleMode: {
      graph: "标准",
      outline: "章节级",
      foreshadow: "主线优先",
      research: "阶段整理",
      style: "章节校准"
    },
    featureHints: [
      "人物图谱建议维护主线人物、势力和关键地点。",
      "大纲建议拆到章节级，避免中段松散。",
      "资料和设定卡按阶段整理，先服务当前卷或当前段落。"
    ]
  },
  {
    value: "LONG",
    label: "长篇",
    description: "适合多阶段成长、多势力关系和持续扩展的世界观。",
    defaultChapterCount: 60,
    defaultWordsPerChapter: 3200,
    structureHint: "建议先做分卷规划，再拆卷目标、阶段高潮和伏笔回收。",
    moduleMode: {
      graph: "深度",
      outline: "分卷 + 章节",
      foreshadow: "持续追踪",
      research: "资料库沉淀",
      style: "长期记忆"
    },
    featureHints: [
      "建议开启分卷规划，先确定卷目标和阶段性高潮。",
      "人物图谱建议维护势力、地点和关键关系变化。",
      "资料检索与设定卡建议持续沉淀，避免长篇后期设定漂移。"
    ]
  }
];

export function getNovelLengthProfile(value?: NovelLengthCategory | null): NovelLengthProfile {
  return novelLengthOptions.find((option) => option.value === value) ?? novelLengthOptions[1];
}

export function getLengthFeatureHints(value?: NovelLengthCategory | null) {
  return getNovelLengthProfile(value).featureHints;
}
