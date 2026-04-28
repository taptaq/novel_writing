import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import NovelStylePage from "@/app/novels/[novelSlug]/style/page";

globalThis.React = React;

const demoWorkspace = {
  novel: {
    id: "novel-1",
    slug: "tide-and-embers",
    title: "潮汐灰烬",
    status: "DRAFTING",
    updatedAt: "2026-04-27T00:00:00.000Z",
    chapterCount: 2,
    wordCount: 6400
  },
  profile: {
    styleSummary: "克制、贴地、慢热推进。",
    styleRules: ["动作先于解释"],
    avoidRules: ["不要整齐排比"],
    dialogueRules: [],
    narrationRules: [],
    rhythmRules: [],
    imageryRules: [],
    status: "READY" as const
  },
  samples: []
};

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  })
}));

vi.mock("@/lib/repositories/novels", () => ({
  getNovelStyleWorkspace: vi.fn(async () => null)
}));

vi.mock("@/lib/demo-data", () => ({
  getDemoStyleWorkspace: vi.fn(() => demoWorkspace)
}));

describe("NovelStylePage", () => {
  it("falls back to the demo style workspace when the current workspace cannot be loaded", async () => {
    const markup = renderToStaticMarkup(
      await NovelStylePage({
        params: { novelSlug: "tide-and-embers" }
      })
    );

    expect(markup).toContain("文风资产");
    expect(markup).toContain("投喂素材");
    expect(markup).toContain("追加样文");
    expect(markup).toContain("加入样文");
  });
});
