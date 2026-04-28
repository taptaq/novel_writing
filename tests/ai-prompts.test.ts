import { describe, expect, it } from "vitest";
import { buildStyleProfileBlock, buildWritingSkillBlock } from "@/lib/ai/prompts";
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
    expect(block).toContain("名称：文风守门");
    expect(block.join("\n")).toContain("去 AI 味");
  });

  it("injects Crucible writing constraints for scene drafting", () => {
    const block = buildWritingSkillBlock(buildInput({ skillPresetId: "crucible-writer" }));
    const text = block.join("\n");

    expect(block).toContain("名称：Crucible 写作");
    expect(text).toContain("场景目标");
    expect(text).toContain("冲突");
    expect(text).toContain("不要解释大纲");
  });

  it("skips writing skill instructions when no preset is selected", () => {
    expect(buildWritingSkillBlock(buildInput())).toEqual([]);
  });
});
