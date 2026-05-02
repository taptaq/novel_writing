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

const realNovels: NovelSummary[] = [
  {
    id: "novel-1",
    slug: "other-project",
    title: "雾海回声",
    premise: "一支调查队在迷雾海域追索失落航线。",
    genre: "奇幻冒险",
    status: "DRAFTING",
    updatedAt: "2026-04-24T00:00:00.000Z",
    chapterCount: 12,
    wordCount: 56000
  },
  {
    id: "novel-2",
    slug: "latest-real-project",
    title: "北境余烬",
    summary: "在冰原王朝崩解前，抄写员带着禁书穿越战线。",
    genre: "历史奇幻",
    status: "DRAFTING",
    updatedAt: "2026-04-27T00:00:00.000Z",
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
    updatedAt: "2026-04-25T00:00:00.000Z",
    chapterCount: 16,
    wordCount: 72000
  }
];

const demoNovels: NovelSummary[] = [
  {
    id: "demo-1",
    slug: "demo-novel",
    title: "示例：北境余烬",
    summary: "这是一个示例项目，用来带你熟悉从设定到写作的完整流程。",
    genre: "历史奇幻",
    status: "DRAFTING",
    updatedAt: "2026-04-20T00:00:00.000Z",
    chapterCount: 8,
    wordCount: 41000
  }
];

let mockResponse: { novels: NovelSummary[]; source: "database" | "demo" } = {
  novels: realNovels,
  source: "database"
};

vi.mock("@/lib/repositories/novels", () => ({
  getNovelSummariesWithSource: vi.fn(async () => mockResponse)
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
  it("continues with the most recently updated real project instead of the first array item", async () => {
    mockResponse = {
      novels: realNovels,
      source: "database"
    };

    const markup = renderToStaticMarkup(await HomePage());
    const pageText = normalizeWhitespace(stripTags(markup));
    const anchors = parseAnchors(markup);

    expect(pageText).toContain("第 1 步");
    expect(pageText).toContain("先把故事写出来");
    expect(pageText).toContain("先看示例，或者直接开一本。");
    expect(pageText).toContain("继续我的书");
    expect(pageText).toContain("新建一本");
    expect(pageText).toContain("我的作品");
    expect(pageText).not.toContain("能力标签");
    expect(pageText).not.toContain("结构建议");
    expect(pageText).not.toContain("设定映射");
    expect(pageText).not.toContain("上下文续写");
    expect(pageText).not.toContain("风格护栏");

    const primaryCta = anchors.find((anchor) => anchor.text === "继续我的书");
    const secondaryCta = anchors.find((anchor) => anchor.text === "新建一本");
    expect(primaryCta?.href).toBe("/novels/latest-real-project");
    expect(secondaryCta?.href).toBe("/novels/new");

    for (const novel of mockResponse.novels) {
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

  it("uses an honest demo CTA when the current list is only fallback demo data", async () => {
    mockResponse = {
      novels: demoNovels,
      source: "demo"
    };

    const markup = renderToStaticMarkup(await HomePage());
    const pageText = normalizeWhitespace(stripTags(markup));
    const anchors = parseAnchors(markup);
    const primaryCta = anchors.find((anchor) => anchor.text === "先看示例");
    const secondaryCta = anchors.find((anchor) => anchor.text === "新建一本");

    expect(pageText).toContain("先看示例");
    expect(pageText).toContain("示例项目");
    expect(pageText).toContain("先看示例，或者直接开一本。");
    expect(pageText).toContain("这是示例，不会写进你的书。");
    expect(primaryCta?.href).toBe("/novels");
    expect(secondaryCta?.href).toBe("/novels/new");
    expect(primaryCta?.href).not.toBe(secondaryCta?.href);
    expect(anchors.some((anchor) => anchor.href === "/demo/demo-novel")).toBe(true);
  });
});
