import type { WritingAssistInput } from "@/lib/ai/types";
import { getWritingSkillPreset } from "@/lib/novel-writing-skills";

export const humanStyleRules = [
  "不要堆华丽形容词，优先使用动作、物件、停顿、环境细节。",
  "不要替角色总结情绪，要让情绪从反应和对白里露出来。",
  "避免整齐排比、金句收尾、万能文学腔。",
  "保留角色口吻差异，不要把所有人写成同一个声音。",
  "如果缺少信息，优先提出谨慎建议，不要硬编设定。"
];

export function buildSystemPrompt() {
  return [
    "你是小说共创助手，不是代笔工具。",
    "你输出的每一段都必须像真人作者推敲后的建议稿，而不是展示模型文采。",
    "所有内容都必须是“建议”，不能替用户做最终决定。",
    "请严格遵守以下文风约束：",
    ...humanStyleRules.map((rule, index) => `${index + 1}. ${rule}`),
    "返回 JSON，对应字段为 summary、primary、alternatives、warnings、nextContext。",
    "primary 和 alternatives 里的每个对象都必须包含 title、text、why。"
  ].join("\n");
}

function buildRuleLines(title: string, rules: string[]) {
  if (rules.length === 0) {
    return [`${title}：`, "- 暂无"];
  }

  return [`${title}：`, ...rules.map((rule) => `- ${rule}`)];
}

export function buildStyleProfileBlock(input: WritingAssistInput) {
  if (input.disableStyleProfile || !input.novel.styleProfile || (input.mode !== "continue" && input.mode !== "rewrite")) {
    return [];
  }

  const profile = input.novel.styleProfile;

  return [
    "文风资产：",
    `文风概述：${profile.styleSummary ?? "暂无概述"}`,
    ...buildRuleLines("正向规则", profile.styleRules),
    ...buildRuleLines("避免表达", profile.avoidRules),
    ...buildRuleLines("对白规则", profile.dialogueRules),
    ...buildRuleLines("叙述规则", profile.narrationRules),
    ...buildRuleLines("节奏规则", profile.rhythmRules),
    ...buildRuleLines("意象规则", profile.imageryRules)
  ];
}

export function buildWritingSkillBlock(input: WritingAssistInput) {
  const preset = getWritingSkillPreset(input.skillPresetId);

  if (!preset) {
    return [];
  }

  return [
    "写作技能预设：",
    `名称：${preset.name}`,
    `参考来源：${preset.sourceName}`,
    `用途：${preset.summary}`,
    "执行重点：",
    ...preset.focus.map((item) => `- ${item}`),
    `预设指令：${preset.instruction}`
  ];
}

export function buildChapterMemoryBlock(input: WritingAssistInput) {
  if (!input.memory) {
    return [];
  }

  return [
    "章节记忆：",
    input.memory.currentFocus ? `本章目标：${input.memory.currentFocus}` : null,
    "前情简述：",
    ...(input.memory.storySoFar.length > 0 ? input.memory.storySoFar.map((item) => `- ${item}`) : ["- 暂无"]),
    "故事线：",
    ...(input.memory.activeStoryLines.length > 0 ? input.memory.activeStoryLines.map((item) => `- ${item}`) : ["- 暂无"]),
    "还没回收的线索：",
    ...(input.memory.openThreads.length > 0 ? input.memory.openThreads.map((item) => `- ${item}`) : ["- 暂无"])
  ].filter((item): item is string => Boolean(item));
}

export function buildSetupParsingPrompt(sourceText: string) {
  return [
    "You are an assistant that must parse novel setup/spec text into a structured creation draft.",
    "Output must be JSON only.",
    'Return exactly one top-level JSON object with this shape: {"title": string, "category": string, "subGenre": string, "targetAudience": string, "premise": string, "narrativeView": string, "storyStructure": string, "lengthCategory": "SHORT" | "MEDIUM" | "LONG", "plannedChapterCount"?: positive integer, "targetWordsPerChapter"?: positive integer, "worldSeed": string, "styleGoal": string, "styleSamples": StyleSample[], "characterSeeds": CharacterSeed[], "guessedFields": string[], "missingFields": string[], "confidenceNotes": string[]}.',
    'Use empty strings or empty arrays when a field is not provided. Do not wrap the object in markdown, prose, or code fences.',
    "If you infer or guess any field, list that field name in guessedFields.",
    "If information is missing from the source, list that field name in missingFields.",
    "Return at most 3 valid character seeds and at most 3 valid style samples.",
    'StyleSample = {"title"?: string, "content": string, "note"?: string}.',
    'CharacterSeed = {"name": string, "role"?: string, "summary"?: string, "factionName"?: string, "locationName"?: string}.',
    "lengthCategory must be one of SHORT, MEDIUM, LONG.",
    "",
    "Source text:",
    sourceText
  ].join("\n");
}

export function buildUserPrompt(input: WritingAssistInput) {
  const entityLines = input.entities.map((entity) => `- ${entity.name}（${entity.type}）：${entity.summary ?? "暂无摘要"}`);
  const foreshadowLines = input.foreshadows.map((item) => `- ${item.hook}（${item.status}）`);
  const styleProfileBlock = buildStyleProfileBlock(input);
  const writingSkillBlock = buildWritingSkillBlock(input);
  const chapterMemoryBlock = buildChapterMemoryBlock(input);

  return [
    `任务模式：${input.mode}`,
    writingSkillBlock.length > 0 ? "" : null,
    ...writingSkillBlock,
    writingSkillBlock.length > 0 ? "" : null,
    `作品：${input.novel.title}`,
    input.novel.premise ? `一句话设定：${input.novel.premise}` : null,
    `章节：${input.chapter.title}`,
    input.chapter.sceneGoal ? `场景目标：${input.chapter.sceneGoal}` : null,
    `用户指令：${input.instruction}`,
    chapterMemoryBlock.length > 0 ? "" : null,
    ...chapterMemoryBlock,
    "",
    "文风规则：",
    ...input.novel.voiceRules.map((rule) => `- ${rule}`),
    styleProfileBlock.length > 0 ? "" : null,
    ...styleProfileBlock,
    "",
    "关键设定：",
    ...(entityLines.length > 0 ? entityLines : ["- 暂无实体设定"]),
    "",
    "待回收线索：",
    ...(foreshadowLines.length > 0 ? foreshadowLines : ["- 暂无伏笔"]),
    "",
    "当前文本：",
    input.currentText,
    input.selectionText ? `\n用户选中片段：\n${input.selectionText}` : null,
    "",
    "要求：",
    "- summary 用一句中文概括这次建议的方向。",
    "- primary 给主建议。",
    "- alternatives 给 2 条备选建议，避免只是改几个词。",
    "- warnings 给出潜在人设/逻辑风险，没有则返回空数组。",
    "- nextContext 给出后续可补充的上下文提示。"
  ]
    .filter(Boolean)
    .join("\n");
}
