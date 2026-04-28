import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WritingAssistResponse } from "@/lib/ai/types";

const { getChapterEditorData, runWritingAssist } = vi.hoisted(() => ({
  getChapterEditorData: vi.fn(),
  runWritingAssist: vi.fn()
}));

vi.mock("@/lib/repositories/novels", () => ({
  getChapterEditorData
}));

vi.mock("@/lib/ai/writing-engine", () => ({
  runWritingAssist
}));

import { POST } from "@/app/api/ai/assist/route";

function buildRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/ai/assist", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json"
    }
  });
}

const chapterData = {
  novel: {
    title: "潮汐来信",
    premise: "港城悬疑"
  },
  voiceRules: ["克制", "留白"],
  styleProfile: {
    styleSummary: "冷感贴身视角",
    styleRules: ["动作先于解释"],
    avoidRules: ["不要抒情过满"],
    dialogueRules: ["对白留白"],
    narrationRules: ["镜头贴近身体"],
    rhythmRules: ["短段落"],
    imageryRules: ["潮气与金属感"]
  },
  chapter: {
    title: "第三声钟响前",
    sceneGoal: "让主角意识到危险"
  },
  entities: [
    {
      name: "沈砚",
      type: "character",
      summary: "守钟人"
    }
  ],
  foreshadows: [
    {
      hook: "匿名来信",
      status: "open"
    }
  ]
};

const assistResponse: WritingAssistResponse = {
  mode: "continue",
  summary: "继续推进悬念。",
  primary: {
    title: "主建议",
    text: "下一段建议文本",
    why: "承接当前动作。"
  },
  alternatives: [],
  warnings: [],
  nextContext: [],
  meta: {
    requestedModel: "glm",
    resolvedProvider: "dmx-glm",
    resolvedModel: "glm-5.1-free",
    usedFallback: false
  }
};

describe("POST /api/ai/assist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getChapterEditorData.mockResolvedValue(chapterData);
    runWritingAssist.mockResolvedValue(assistResponse);
  });

  it("accepts modelSelection in the request payload", async () => {
    const response = await POST(
      buildRequest({
        novelSlug: "novel",
        chapterSlug: "chapter",
        mode: "continue",
        modelSelection: "glm",
        instruction: "继续写",
        currentText: "海风卷进钟楼。"
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(assistResponse);
  });

  it("passes modelSelection through to runWritingAssist", async () => {
    await POST(
      buildRequest({
        novelSlug: "novel",
        chapterSlug: "chapter",
        mode: "continue",
        modelSelection: "glm",
        instruction: "继续写",
        currentText: "海风卷进钟楼。"
      })
    );

    expect(runWritingAssist).toHaveBeenCalledWith(
      expect.objectContaining({
        modelSelection: "glm"
      })
    );
  });

  it("passes writing skill preset through to runWritingAssist", async () => {
    await POST(
      buildRequest({
        novelSlug: "novel",
        chapterSlug: "chapter",
        mode: "rewrite",
        modelSelection: "glm",
        skillPresetId: "voice-keeper",
        instruction: "改得更克制",
        currentText: "海风卷进钟楼。"
      })
    );

    expect(runWritingAssist).toHaveBeenCalledWith(
      expect.objectContaining({
        skillPresetId: "voice-keeper"
      })
    );
  });

  it("returns 400 for an invalid writing skill preset", async () => {
    const response = await POST(
      buildRequest({
        novelSlug: "novel",
        chapterSlug: "chapter",
        mode: "continue",
        modelSelection: "glm",
        skillPresetId: "bad-skill",
        instruction: "继续写",
        currentText: "海风卷进钟楼。"
      })
    );

    expect(response.status).toBe(400);
    expect(runWritingAssist).not.toHaveBeenCalled();
  });

  it("passes styleProfile and disableStyleProfile through to runWritingAssist", async () => {
    await POST(
      buildRequest({
        novelSlug: "novel",
        chapterSlug: "chapter",
        mode: "rewrite",
        modelSelection: "glm",
        disableStyleProfile: true,
        instruction: "改得更克制",
        currentText: "海风卷进钟楼。"
      })
    );

    expect(runWritingAssist).toHaveBeenCalledWith(
      expect.objectContaining({
        disableStyleProfile: true,
        novel: expect.objectContaining({
          styleProfile: chapterData.styleProfile
        })
      })
    );
  });

  it("returns 400 for an invalid modelSelection", async () => {
    const response = await POST(
      buildRequest({
        novelSlug: "novel",
        chapterSlug: "chapter",
        mode: "continue",
        modelSelection: "bad-model",
        instruction: "继续写",
        currentText: "海风卷进钟楼。"
      })
    );

    expect(response.status).toBe(400);
    expect(runWritingAssist).not.toHaveBeenCalled();
  });

  it("returns 500 when the writing assist request fails internally", async () => {
    runWritingAssist.mockRejectedValueOnce(new Error("provider exploded"));

    const response = await POST(
      buildRequest({
        novelSlug: "novel",
        chapterSlug: "chapter",
        mode: "continue",
        modelSelection: "glm",
        instruction: "继续写",
        currentText: "海风卷进钟楼。"
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "AI request failed."
    });
  });
});
