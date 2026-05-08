import { describe, expect, it } from "vitest";
import {
  buildSetupChineseRewritePrompt,
  buildSetupParsingPrompt,
  buildChapterMemoryBlock,
  buildStyleProfileBlock,
  buildWritingSkillBlock
} from "@/lib/ai/prompts";
import type { WritingAssistInput } from "@/lib/ai/types";

function buildInput(overrides: Partial<WritingAssistInput> = {}): WritingAssistInput {
  return {
    mode: "continue",
    modelSelection: "auto",
    instruction: "继续写",
    currentText: "海风卷进钟楼。",
    novel: {
      title: "雾港航线",
      voiceRules: ["克制", "留白"],
      styleProfile: {
        styleSummary: "冷感贴身视角",
        styleRules: ["动作先于解释"],
        avoidRules: ["不要抒情过满"],
        dialogueRules: ["对白留白"],
        narrationRules: ["镜头贴近身体"],
        rhythmRules: ["短段落"],
        imageryRules: ["潮气与金属感"]
      }
    },
    chapter: {
      title: "第三声钟响前"
    },
    entities: [],
    foreshadows: [],
    ...overrides
  };
}

describe("buildStyleProfileBlock", () => {
  it("injects style profile rules for continue mode", () => {
    expect(buildStyleProfileBlock(buildInput({ mode: "continue" }))).toContain("文风资产：");
  });

  it("injects style profile rules for rewrite mode", () => {
    expect(buildStyleProfileBlock(buildInput({ mode: "rewrite" }))).toContain("文风资产：");
  });

  it("skips style profile rules when disableStyleProfile is true", () => {
    expect(buildStyleProfileBlock(buildInput({ disableStyleProfile: true }))).toEqual([]);
  });

  it("skips style profile rules for non-writing modes", () => {
    expect(buildStyleProfileBlock(buildInput({ mode: "outline" }))).toEqual([]);
    expect(buildStyleProfileBlock(buildInput({ mode: "audit" }))).toEqual([]);
  });
});

describe("buildWritingSkillBlock", () => {
  it("injects the selected writing skill preset", () => {
    const block = buildWritingSkillBlock(buildInput({ skillPresetId: "voice-keeper" }));

    expect(block).toContain("写作技能预设：");
    expect(block).toContain("名称：去掉 AI 味");
    expect(block.join("\n")).toContain("AI 味");
  });

  it("injects Crucible writing constraints for scene drafting", () => {
    const block = buildWritingSkillBlock(buildInput({ skillPresetId: "crucible-writer" }));
    const text = block.join("\n");

    expect(block).toContain("名称：继续写一小段");
    expect(text).toContain("场景目标");
    expect(text).toContain("冲突");
    expect(text).toContain("不要解释大纲");
  });

  it("skips writing skill instructions when no preset is selected", () => {
    expect(buildWritingSkillBlock(buildInput())).toEqual([]);
  });
});

describe("buildChapterMemoryBlock", () => {
  it("injects compact previous-story memory", () => {
    const block = buildChapterMemoryBlock(
      buildInput({
        memory: {
          storySoFar: ["第1章《潮湿来信》：沈砚收到匿名来信。"],
          activeStoryLines: ["主线：潮汐钟失准。"],
          openThreads: ["匿名来信 -> 真正收件人未揭开。"],
          currentFocus: "让主角意识到危险"
        }
      })
    );
    const text = block.join("\n");

    expect(block).toContain("章节记忆：");
    expect(text).toContain("前情简述");
    expect(text).toContain("沈砚收到匿名来信");
    expect(text).toContain("真正收件人未揭开");
  });
});

describe("buildSetupParsingPrompt", () => {
  it("forces Chinese user-facing values while keeping a strict JSON schema", () => {
    const prompt = buildSetupParsingPrompt("主角是钟楼修理匠，故事偏中篇悬疑。");

    expect(prompt).toContain("你要把小说设定说明解析成结构化建书草稿");
    expect(prompt).toContain("只返回一个 JSON 对象");
    expect(prompt).toContain("除 guessedFields 和 missingFields 里的字段名外");
    expect(prompt).toContain("所有给用户看的字段值都必须使用简体中文");
    expect(prompt).toContain("不要输出英文句子");
    expect(prompt).toContain("\"title\": string");
    expect(prompt).toContain("\"lengthCategory\": \"SHORT\" | \"MEDIUM\" | \"LONG\"");
    expect(prompt).toContain("\"plannedChapterCount\"?: positive integer");
    expect(prompt).toContain("\"targetWordsPerChapter\"?: positive integer");
    expect(prompt).toContain("\"styleSamples\": StyleSample[]");
    expect(prompt).toContain("\"characterSeeds\": CharacterSeed[]");
    expect(prompt).toContain("\"factionSeeds\": GraphEntitySeed[]");
    expect(prompt).toContain("\"locationSeeds\": GraphEntitySeed[]");
    expect(prompt).toContain("\"relationSeeds\": RelationSeed[]");
    expect(prompt).toContain("如果某个字段没有信息，使用空字符串或空数组");
    expect(prompt).toContain("不要输出 markdown、解释文字或代码块");
    expect(prompt).toContain("StyleSample = {\"title\"?: string, \"content\": string, \"note\"?: string}");
    expect(prompt).toContain("CharacterSeed = {\"name\": string, \"role\"?: string, \"summary\"?: string, \"factionName\"?: string, \"locationName\"?: string}");
    expect(prompt).toContain("GraphEntitySeed = {\"name\": string, \"summary\"?: string}");
    expect(prompt).toContain("RelationSeed = {\"sourceName\": string, \"targetName\": string, \"type\": \"ALLY\" | \"ENEMY\" | \"FAMILY\" | \"MENTOR\" | \"SUBORDINATE\" | \"OTHER\" | \"MEMBER_OF\" | \"ROOTED_IN\"");
    expect(prompt).toContain("guessedFields");
    expect(prompt).toContain("missingFields");
    expect(prompt).toContain("不要限制 characterSeeds、factionSeeds、locationSeeds、relationSeeds 的有效数量");
    expect(prompt).toContain("最多返回 3 段有效 styleSamples");
    expect(prompt).toContain("同一个名称只能归属于一种图谱实体类型");
    expect(prompt).toContain("不能同时出现在 characterSeeds、factionSeeds、locationSeeds");
    expect(prompt).toContain("如果同名实体既像地点又像势力，优先依据角色引用和关系类型判断");
    expect(prompt).toContain("SHORT");
    expect(prompt).toContain("MEDIUM");
    expect(prompt).toContain("LONG");
    expect(prompt).toContain("主角是钟楼修理匠，故事偏中篇悬疑。");
  });
});

describe("buildSetupChineseRewritePrompt", () => {
  it("asks the model to rewrite visible values into simplified Chinese without changing schema", () => {
    const prompt = buildSetupChineseRewritePrompt({
      title: "Tide Ashes",
      premise: "A clockmaker apprentice gets pulled into an old port disappearance case.",
      guessedFields: ["targetAudience"],
      missingFields: ["styleSamples"]
    });

    expect(prompt).toContain("把下面这个建书草稿 JSON 改写成简体中文");
    expect(prompt).toContain("不要改变 JSON 结构");
    expect(prompt).toContain("guessedFields 和 missingFields 里的字段名保持英文不变");
    expect(prompt).toContain("不要保留英文句子");
    expect(prompt).toContain("\"title\":\"Tide Ashes\"");
    expect(prompt).toContain("\"guessedFields\":[\"targetAudience\"]");
  });
});
