import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import OutlinePage from "@/app/novels/[novelSlug]/outline/page";

globalThis.React = React;

vi.mock("@/lib/repositories/novels", () => ({
  getNovelWorkspace: vi.fn(async () => ({
    novel: {
      id: "novel-1",
      slug: "glass-city",
      title: "玻璃城遗闻",
      premise: "她要从玻璃废墟里找回姐姐留下的第二份遗嘱。",
      status: "DRAFTING",
      updatedAt: "2026-04-27T00:00:00.000Z",
      chapterCount: 12,
      wordCount: 54000
    },
    outlines: [
      {
        id: "outline-1",
        title: "先让危险出现",
        summary: "主角先感觉不对，再逼近答案。",
        depth: 1,
        order: 1,
        status: "ACTIVE"
      }
    ],
    foreshadows: [
      {
        id: "foreshadow-1",
        hook: "第二份遗嘱",
        plannedPayoff: "中段揭开真正用途",
        status: "OPEN"
      }
    ],
    entities: [],
    voiceRules: [],
    chapters: []
  }))
}));

describe("OutlinePage", () => {
  it("uses plain language to explain outline and foreshadow sections", async () => {
    const markup = renderToStaticMarkup(await OutlinePage({ params: { novelSlug: "glass-city" } }));

    expect(markup).toContain("不知道后面怎么写时，就先看这里");
    expect(markup).toContain("把后面几章的大概走向顺一下，就不容易写着写着跑偏。");
    expect(markup).toContain("这一段大概怎么发展");
    expect(markup).toContain("先让危险出现");
    expect(markup).toContain("还没回收的线索");
    expect(markup).toContain("第二份遗嘱");
  });
});
