import { describe, expect, it } from "vitest";
import {
  buildEffectiveStyleContext,
  normalizeStyleProfile,
  novelStyleProfileSchema,
  novelStyleSampleSchema
} from "@/lib/novel-style";

describe("novelStyleSampleSchema", () => {
  it("accepts a manual style sample with content", () => {
    expect(
      novelStyleSampleSchema.parse({
        title: "冷雨开场",
        content: "她没有立刻回头，只是把灯绳又绕了一圈，等雨声先落稳。",
        note: "偏克制、停顿多"
      }).content
    ).toContain("她没有立刻回头");
  });

  it("rejects sample content shorter than 20 characters", () => {
    expect(() =>
      novelStyleSampleSchema.parse({
        title: "短样文",
        content: "她没有立刻回头，只把灯绳绕了一圈。"
      })
    ).toThrow("参考样文至少需要 20 个字符");
  });

  it("rejects empty sample content", () => {
    expect(() =>
      novelStyleSampleSchema.parse({
        title: "空样文",
        content: "   "
      })
    ).toThrow("参考样文至少需要 20 个字符");
  });
});

describe("normalizeStyleProfile", () => {
  it("keeps metadata, defaults status, clears empty summary, and drops blank rules", () => {
    expect(novelStyleProfileSchema.parse({}).status).toBe("EMPTY");

    expect(
      normalizeStyleProfile({
        id: "profile-1",
        styleSummary: "冷静贴脸",
        styleRules: ["动作先于解释", " ", "少用总结句"],
        avoidRules: ["不要金句收尾", ""]
      })
    ).toMatchObject({
      id: "profile-1",
      styleSummary: "冷静贴脸",
      styleRules: ["动作先于解释", "少用总结句"],
      avoidRules: ["不要金句收尾"],
      status: "EMPTY"
    });
  });

  it("normalizes empty summary to undefined and cleans multiple rule groups", () => {
    expect(
      normalizeStyleProfile({
        lastGeneratedAt: "2026-04-27T00:00:00.000Z",
        styleSummary: "   ",
        dialogueRules: ["对话短促", " "],
        rhythmRules: ["多停顿", "", "段落短"],
        imageryRules: ["少比喻", "  "]
      })
    ).toMatchObject({
      lastGeneratedAt: "2026-04-27T00:00:00.000Z",
      styleSummary: undefined,
      dialogueRules: ["对话短促"],
      rhythmRules: ["多停顿", "段落短"],
      imageryRules: ["少比喻"],
      status: "EMPTY"
    });
  });
});

describe("buildEffectiveStyleContext", () => {
  it("returns empty state when style is disabled for this request", () => {
    expect(
      buildEffectiveStyleContext(
        {
          styleSummary: "克制",
          styleRules: ["少解释"],
          avoidRules: ["别抒情过满"],
          dialogueRules: [],
          narrationRules: [],
          rhythmRules: [],
          imageryRules: [],
          status: "READY"
        },
        true
      ).enabled
    ).toBe(false);
  });

  it("returns empty state when profile status is not ready", () => {
    expect(
      buildEffectiveStyleContext(
        {
          id: "profile-2",
          styleSummary: "克制",
          styleRules: ["少解释"],
          avoidRules: ["别抒情过满"],
          dialogueRules: [],
          narrationRules: [],
          rhythmRules: [],
          imageryRules: [],
          status: "FAILED"
        },
        false
      )
    ).toEqual({ enabled: false, profile: undefined });
  });

  it("returns enabled context when profile is ready", () => {
    const profile = {
      id: "profile-1",
      styleSummary: "克制",
      styleRules: ["少解释"],
      avoidRules: ["别抒情过满"],
      dialogueRules: ["对白留白"],
      narrationRules: [],
      rhythmRules: [],
      imageryRules: [],
      status: "READY" as const,
      lastGeneratedAt: "2026-04-27T00:00:00.000Z"
    };

    expect(buildEffectiveStyleContext(profile, false)).toEqual({
      enabled: true,
      profile
    });
  });
});
