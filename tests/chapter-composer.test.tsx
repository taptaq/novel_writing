import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildAssistRequestBody,
  ChapterComposer,
  getStyleProfileUiState
} from "@/components/chapter-composer";
import type { ChapterEditorData } from "@/types/domain";

globalThis.React = React;

type ParsedElement = {
  attributes: Record<string, string>;
  html: string;
  text: string;
};

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseAttributes(rawAttributes: string): Record<string, string> {
  return Object.fromEntries(
    Array.from(rawAttributes.matchAll(/([^\s=]+)="([^"]*)"/g)).map((match) => [match[1], match[2]])
  );
}

function parseElements(markup: string, tagName: string): ParsedElement[] {
  const pattern = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, "g");

  return Array.from(markup.matchAll(pattern)).map((match) => ({
    attributes: parseAttributes(match[1]),
    html: match[2],
    text: normalizeWhitespace(stripTags(match[2]))
  }));
}

const chapterData: ChapterEditorData = {
  novel: {
    id: "novel-1",
    slug: "mist-harbor",
    title: "雾港航线",
    premise: "失踪灯塔重新亮起。",
    genre: "海洋悬疑",
    status: "DRAFTING",
    updatedAt: "2026-04-26T00:00:00.000Z",
    chapterCount: 14,
    wordCount: 68000
  },
  voiceRules: ["克制", "留白"],
  styleProfile: {
    id: "profile-1",
    styleSummary: "冷感贴身视角",
    styleRules: ["动作先于解释"],
    avoidRules: ["不要抒情过满"],
    dialogueRules: ["对白留白"],
    narrationRules: ["镜头贴近身体"],
    rhythmRules: ["短段落"],
    imageryRules: ["潮气与金属感"],
    status: "READY",
    lastGeneratedAt: "2026-04-26T03:00:00.000Z"
  },
  chapter: {
    id: "chapter-1",
    slug: "bell-before-dawn",
    title: "第三声钟响前",
    sceneGoal: "让主角意识到危险",
    order: 3,
    status: "DRAFT",
    wordCount: 1800,
    content: "海风卷进钟楼。"
  },
  entities: [
    {
      id: "entity-1",
      type: "CHARACTER",
      name: "沈砚",
      summary: "守钟人",
      tags: []
    }
  ],
  relevantOutlines: [],
  foreshadows: [
    {
      id: "foreshadow-1",
      hook: "匿名来信",
      status: "OPEN"
    }
  ]
};

describe("ChapterComposer", () => {
  it("shows the model selector with the default auto option visible", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
    );
    const selects = parseElements(markup, "select");
    const modelSelect = selects.find((element) => element.attributes.name === "modelSelection");
    const modelOptions = modelSelect ? parseElements(modelSelect.html, "option") : [];
    const selectedOption = modelOptions.find((element) => "selected" in element.attributes);

    expect(modelSelect).toBeDefined();
    expect(modelSelect?.text).toContain("自动");
    expect(selectedOption?.attributes.value).toBe("auto");
    expect(selectedOption?.text).toBe("自动");
  });

  it("lists all supported model selection options", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
    );
    const selects = parseElements(markup, "select");
    const modelSelect = selects.find((element) => element.attributes.name === "modelSelection");
    const options = modelSelect ? parseElements(modelSelect.html, "option").map((element) => element.text) : [];

    expect(modelSelect).toBeDefined();
    expect(options).toEqual(["自动", "Kimi", "GLM", "Mimo", "MiniMax", "Qwen", "DeepSeek", "系统兜底"]);
  });

  it("lists writing skill presets for temporary chapter-level switching", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
    );
    const selects = parseElements(markup, "select");
    const skillSelect = selects.find((element) => element.attributes.name === "skillPresetId");
    const options = skillSelect ? parseElements(skillSelect.html, "option").map((element) => element.text) : [];

    expect(skillSelect).toBeDefined();
    expect(options).toEqual([
      "不使用预设",
      "流程规划",
      "章节任务卡",
      "创作工具箱",
      "文风守门",
      "Crucible 规划",
      "Crucible 大纲",
      "Crucible 写作",
      "Crucible 编辑"
    ]);
  });

  it("shows a lightweight style-profile hint with style constraints enabled by default", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
    );
    const buttons = parseElements(markup, "button");
    const enabledButton = buttons.find((element) => element.text === "当前已应用文风资产");
    const disabledButton = buttons.find((element) => element.text === "本次不使用文风约束");

    expect(normalizeWhitespace(stripTags(markup))).toContain("当前已应用文风资产");
    expect(normalizeWhitespace(stripTags(markup))).toContain("本次不使用文风约束");
    expect(enabledButton?.attributes["aria-pressed"]).toBe("true");
    expect(disabledButton?.attributes["aria-pressed"]).toBe("false");
  });

  it("shows a lightweight message instead of style toggle when no style profile is available", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer
        novelSlug="mist-harbor"
        chapterSlug="bell-before-dawn"
        data={{ ...chapterData, styleProfile: undefined }}
      />
    );
    const text = normalizeWhitespace(stripTags(markup));

    expect(text).toContain("当前作品还没有可用文风资产");
    expect(text).not.toContain("当前已应用文风资产");
    expect(text).not.toContain("本次不使用文风约束");
  });

  it("returns a mode-specific lightweight message when the current mode does not use style profile", () => {
    expect(getStyleProfileUiState("outline", chapterData.styleProfile)).toEqual({
      kind: "message",
      message: "当前模式不使用文风资产"
    });
  });

  it("builds an assist payload with disableStyleProfile when style constraints are turned off", () => {
    expect(
      buildAssistRequestBody({
        novelSlug: "mist-harbor",
        chapterSlug: "bell-before-dawn",
        mode: "rewrite",
        modelSelection: "glm",
        skillPresetId: "voice-keeper",
        disableStyleProfile: true,
        instruction: "改得更克制",
        currentText: "海风卷进钟楼。"
      })
    ).toEqual({
      novelSlug: "mist-harbor",
      chapterSlug: "bell-before-dawn",
      mode: "rewrite",
      modelSelection: "glm",
      skillPresetId: "voice-keeper",
      disableStyleProfile: true,
      instruction: "改得更克制",
      currentText: "海风卷进钟楼。"
    });
  });
});
