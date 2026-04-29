import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import WorldPage from "@/app/novels/[novelSlug]/world/page";

globalThis.React = React;

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

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
    entities: [
      {
        id: "entity-1",
        type: "CHARACTER",
        name: "祝衡",
        summary: "档案修复师",
        tags: []
      }
    ],
    voiceRules: [],
    chapters: [],
    outlines: [],
    foreshadows: []
  }))
}));

describe("WorldPage", () => {
  it("renders beginner-friendly setting guidance and graph entry", async () => {
    const markup = renderToStaticMarkup(await WorldPage({ params: { novelSlug: "glass-city" } }));

    expect(markup).toContain("人物、势力、地点都在这里");
    expect(markup).toContain("忘了谁是谁、谁跟谁有关，就回这里补和查。");
    expect(markup).toContain("去看关系图");
    expect(markup).toContain("人物列表");
    expect(markup).toContain("祝衡");
  });
});
