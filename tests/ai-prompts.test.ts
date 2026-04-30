import { describe, expect, it } from "vitest";
import {
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
  it("describes a single top-level JSON object with concrete field types", () => {
    const prompt = buildSetupParsingPrompt("主角是钟楼修理匠，故事偏中篇悬疑。");

    expect(prompt).toContain("parse novel setup/spec text into a structured creation draft");
    expect(prompt).toContain("JSON only");
    expect(prompt).toContain("Return exactly one top-level JSON object with this shape");
    expect(prompt).toContain("\"title\": string");
    expect(prompt).toContain("\"lengthCategory\": \"SHORT\" | \"MEDIUM\" | \"LONG\"");
    expect(prompt).toContain("\"plannedChapterCount\"?: positive integer");
    expect(prompt).toContain("\"targetWordsPerChapter\"?: positive integer");
    expect(prompt).toContain("\"styleSamples\": StyleSample[]");
    expect(prompt).toContain("\"characterSeeds\": CharacterSeed[]");
    expect(prompt).toContain("\"factionSeeds\": GraphEntitySeed[]");
    expect(prompt).toContain("\"locationSeeds\": GraphEntitySeed[]");
    expect(prompt).toContain("\"relationSeeds\": RelationSeed[]");
    expect(prompt).toContain("Use empty strings or empty arrays when a field is not provided");
    expect(prompt).toContain("Do not wrap the object in markdown, prose, or code fences");
    expect(prompt).toContain("StyleSample = {\"title\"?: string, \"content\": string, \"note\"?: string}");
    expect(prompt).toContain("CharacterSeed = {\"name\": string, \"role\"?: string, \"summary\"?: string, \"factionName\"?: string, \"locationName\"?: string}");
    expect(prompt).toContain("GraphEntitySeed = {\"name\": string, \"summary\"?: string}");
    expect(prompt).toContain("RelationSeed = {\"sourceName\": string, \"targetName\": string, \"type\": \"ALLY\" | \"ENEMY\" | \"FAMILY\" | \"MENTOR\" | \"SUBORDINATE\" | \"OTHER\" | \"MEMBER_OF\" | \"ROOTED_IN\"");
    expect(prompt).toContain("guessedFields");
    expect(prompt).toContain("missingFields");
    expect(prompt).toContain("Do not limit valid character seeds, faction seeds, location seeds, or relation seeds");
    expect(prompt).toContain("at most 3 valid style samples");
    expect(prompt).toContain("SHORT");
    expect(prompt).toContain("MEDIUM");
    expect(prompt).toContain("LONG");
    expect(prompt).toContain("主角是钟楼修理匠，故事偏中篇悬疑。");
  });
});
