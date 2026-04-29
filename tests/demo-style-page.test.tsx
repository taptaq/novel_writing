import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import DemoStylePage from "@/app/demo/[novelSlug]/style/page";

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

vi.mock("@/lib/demo-data", () => ({
  getDemoStyleWorkspace: vi.fn(() => demoWorkspace)
}));

describe("DemoStylePage", () => {
  it("renders the demo style workspace on the dedicated demo route", async () => {
    const markup = renderToStaticMarkup(
      await DemoStylePage({
        params: { novelSlug: "tide-and-embers" }
      })
    );

    expect(markup).toContain("让 AI 更像这本书");
    expect(markup).toContain("上传你认可的文字");
    expect(markup).toContain("新增样文");
    expect(markup).toContain("加入这段样文");
  });
});
