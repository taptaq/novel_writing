import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import type { NovelSummary } from "@/types/domain";

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

const featuredNovels: NovelSummary[] = [
  {
    id: "novel-1",
    slug: "other-project",
    title: "雾海回声",
    premise: "一支调查队在迷雾海域追索失落航线。",
    genre: "奇幻冒险",
    status: "DRAFTING",
    updatedAt: "2026-04-26T00:00:00.000Z",
    chapterCount: 12,
    wordCount: 56000
  },
  {
    id: "novel-2",
    slug: "demo-novel",
    title: "北境余烬",
    summary: "在冰原王朝崩解前，抄写员带着禁书穿越战线。",
    genre: "历史奇幻",
    status: "DRAFTING",
    updatedAt: "2026-04-26T00:00:00.000Z",
    chapterCount: 8,
    wordCount: 41000
  },
  {
    id: "novel-3",
    slug: "tide-and-embers",
    title: "潮与余烬",
    summary: "港城余火未熄，旧船员必须在下一次风暴前拼回失落航图。",
    genre: "海洋奇幻",
    status: "DRAFTING",
    updatedAt: "2026-04-26T00:00:00.000Z",
    chapterCount: 16,
    wordCount: 72000
  }
];

let mockNovels: NovelSummary[] = featuredNovels;

vi.mock("@/lib/repositories/novels", () => ({
  getNovelSummaries: vi.fn(async () => mockNovels)
}));

type ParsedAnchor = {
  href: string;
  html: string;
  text: string;
};

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseAnchors(markup: string): ParsedAnchor[] {
  return Array.from(markup.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)).map((match) => ({
    href: match[1],
    html: match[2],
    text: normalizeWhitespace(stripTags(match[2]))
  }));
}

describe("HomePage", () => {
  it("uses the featured demo novel for the primary CTA when the explicit slug exists", async () => {
    mockNovels = featuredNovels;

    const markup = renderToStaticMarkup(await HomePage());
    const pageText = normalizeWhitespace(stripTags(markup));
    const anchors = parseAnchors(markup);

    expect(pageText).toContain("AI 协作写作，不替作者做决定。");
    expect(pageText).toContain("进入示例工作区");
    expect(pageText).toContain("查看作品");
    expect(pageText).toContain("结构");
    expect(pageText).toContain("设定");
    expect(pageText).toContain("写作");
    expect(pageText).toContain("最近作品");
    expect(pageText).toContain("结构建议");
    expect(pageText).toContain("设定映射");
    expect(pageText).toContain("上下文续写");
    expect(pageText).toContain("风格护栏");

    const primaryCta = anchors.find((anchor) => anchor.text === "进入示例工作区");
    expect(primaryCta?.href).toBe("/novels/tide-and-embers");

    for (const novel of mockNovels) {
      const expectedSummary = novel.summary ?? novel.premise;
      const projectLink = anchors.find(
        (anchor) => anchor.href === `/novels/${novel.slug}` && anchor.text.includes(novel.title)
      );

      expect(projectLink, `missing project link for ${novel.slug}`).toBeDefined();
      expect(projectLink?.text).toContain(novel.title);
      expect(projectLink?.text).toContain(expectedSummary);
      expect(projectLink?.text).toContain(novel.genre ?? "未分类");
      expect(projectLink?.text).toContain(`${novel.chapterCount} 章`);
      expect(projectLink?.text).toContain(`${novel.wordCount} 字`);
    }

    expect(pageText).not.toContain("框架重点");
    expect(pageText).not.toContain("先搭稳的三层");
    expect(pageText).not.toContain("写作中");
  });

  it("falls back to a distinct recent-project CTA when the featured slug is absent", async () => {
    mockNovels = featuredNovels.filter((novel) => novel.slug !== "tide-and-embers");

    const markup = renderToStaticMarkup(await HomePage());
    const pageText = normalizeWhitespace(stripTags(markup));
    const anchors = parseAnchors(markup);
    const primaryCta = anchors.find((anchor) => anchor.text === "继续最近项目");
    const secondaryCta = anchors.find((anchor) => anchor.text === "查看作品");

    expect(pageText).toContain("继续最近项目");
    expect(pageText).not.toContain("进入示例工作区");
    expect(primaryCta?.href).toBe("/novels/other-project");
    expect(secondaryCta?.href).toBe("/novels");
    expect(primaryCta?.href).not.toBe(secondaryCta?.href);
  });
});
