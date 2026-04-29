import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import InsightsPage from "@/app/novels/[novelSlug]/insights/page";

globalThis.React = React;

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  })
}));

vi.mock("next/navigation", () => ({
  notFound
}));

const workspace = {
  novel: {
    id: "novel-1",
    slug: "glass-city",
    title: "玻璃城遗闻",
    premise: "她要从玻璃废墟里找回姐姐留下的第二份遗嘱。",
    genre: "都市奇想",
    status: "DRAFTING",
    updatedAt: "2026-04-27T00:00:00.000Z",
    chapterCount: 12,
    wordCount: 54000,
    lengthCategory: "MEDIUM"
  },
  voiceRules: ["动作先于解释", "少用结论句", "对白留白，不抢叙述节奏"],
  chapters: [],
  entities: [],
  outlines: [],
  foreshadows: []
};

let mockWorkspace: typeof workspace | null = workspace;

vi.mock("@/lib/repositories/novels", () => ({
  getNovelWorkspace: vi.fn(async () => mockWorkspace)
}));

describe("InsightsPage", () => {
  it("renders clearer lightweight intros for the strategy and skill sections", async () => {
    mockWorkspace = workspace;

    const markup = renderToStaticMarkup(
      await InsightsPage({
        params: {
          novelSlug: "glass-city"
        }
      })
    );

    expect(markup).toContain("按这本书现在的篇幅，先优先关注这些地方。");
    expect(markup).toContain("不用背术语，按你现在遇到的问题来点就行。");
    expect(markup).toContain("不知道怎么配模型时，先按这套来。");
    expect(markup).toContain("insight-section-intro");
    expect(markup).toContain("insight-skill-copy");
  });

  it("delegates to notFound when the workspace does not exist", async () => {
    mockWorkspace = null;

    await expect(
      InsightsPage({
        params: {
          novelSlug: "missing-book"
        }
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
