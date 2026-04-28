import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import NovelsPage from "@/app/novels/page";
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

const mockNovels: NovelSummary[] = [
  {
    id: "novel-1",
    slug: "mist-harbor",
    title: "雾港航线",
    premise: "失踪灯塔重新亮起后，守夜人被迫带队进入禁海。",
    genre: "海洋悬疑",
    status: "DRAFTING",
    updatedAt: "2026-04-26T00:00:00.000Z",
    chapterCount: 14,
    wordCount: 68000
  },
  {
    id: "novel-2",
    slug: "ashes-of-the-north",
    title: "北境灰烬",
    summary: "王都陷落前夜，抄写员带着一页伪史穿越边境。",
    premise: "这条 premise 不该优先出现。",
    genre: "历史奇幻",
    status: "PLANNING",
    updatedAt: "2026-04-26T00:00:00.000Z",
    chapterCount: 9,
    wordCount: 43000
  },
  {
    id: "novel-3",
    slug: "glass-citadel",
    title: "玻璃城遗闻",
    genre: "都市奇想",
    status: "HIATUS",
    updatedAt: "2026-04-26T00:00:00.000Z",
    chapterCount: 22,
    wordCount: 91000
  }
];

vi.mock("@/lib/repositories/novels", () => ({
  getNovelSummaries: vi.fn(async () => mockNovels)
}));

const summaryFallback = "进入这个项目，继续整理结构、设定与章节内容。";

type ParsedElement = {
  attributes: Record<string, string>;
  classes: string[];
  html: string;
  text: string;
};

type ParsedOpeningTag = {
  attributes: Record<string, string>;
  classes: string[];
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

  return Array.from(markup.matchAll(pattern)).map((match) => {
    const attributes = parseAttributes(match[1]);

    return {
      attributes,
      classes: (attributes.class ?? "").split(/\s+/).filter(Boolean),
      html: match[2],
      text: normalizeWhitespace(stripTags(match[2]))
    };
  });
}

function parseOpeningTags(markup: string, tagName: string): ParsedOpeningTag[] {
  const pattern = new RegExp(`<${tagName}\\b([^>]*)>`, "g");

  return Array.from(markup.matchAll(pattern)).map((match) => {
    const attributes = parseAttributes(match[1]);

    return {
      attributes,
      classes: (attributes.class ?? "").split(/\s+/).filter(Boolean)
    };
  });
}

describe("NovelsPage", () => {
  it("renders a concise project-entry novels index contract", async () => {
    const markup = renderToStaticMarkup(await NovelsPage());
    const pageText = normalizeWhitespace(stripTags(markup));
    const sections = parseOpeningTags(markup, "section");
    const divs = parseOpeningTags(markup, "div");
    const anchors = parseElements(markup, "a");
    const projectCards = anchors.filter((anchor) => anchor.classes.includes("project-entry-card"));
    const copyWrappers = divs.filter((div) => div.classes.includes("project-entry-copy"));
    const fallbackNovel = mockNovels[2];
    const fallbackCard = projectCards.find((card) => card.attributes.href === `/novels/${fallbackNovel.slug}`);

    expect(sections.some((section) => section.classes.includes("panel") && section.classes.includes("library-panel"))).toBe(
      true
    );
    expect(divs.some((div) => div.classes.includes("library-header"))).toBe(true);
    expect(divs.some((div) => div.classes.includes("library-list"))).toBe(true);
    expect(pageText).toContain("作品库");
    expect(pageText).toContain("选择一个项目继续推进");
    expect(pageText).toContain("从最近的小说项目进入结构、设定和章节工作区。");
    expect(
      anchors.some((anchor) => anchor.attributes.href === "/novels/new" && anchor.text.includes("新建书籍"))
    ).toBe(true);
    expect(projectCards).toHaveLength(mockNovels.length);
    expect(copyWrappers).toHaveLength(mockNovels.length);

    for (const novel of mockNovels) {
      const expectedSummary = novel.summary ?? novel.premise ?? summaryFallback;
      const projectCard = projectCards.find(
        (anchor) => anchor.attributes.href === `/novels/${novel.slug}` && anchor.text.includes(novel.title)
      );

      expect(projectCard, `missing project link for ${novel.slug}`).toBeDefined();
      expect(projectCard?.text).toContain(novel.title);
      expect(projectCard?.text).toContain(expectedSummary);
      expect(projectCard?.text).toContain(novel.genre ?? "未分类");
      expect(projectCard?.text).toContain(`${novel.chapterCount} 章`);
      expect(projectCard?.text).toContain(`${novel.wordCount} 字`);
    }

    expect(pageText).toContain(mockNovels[1].summary as string);
    expect(pageText).not.toContain(mockNovels[1].premise as string);
    expect(pageText.match(new RegExp(summaryFallback, "g"))).toHaveLength(1);
    expect(fallbackCard?.text).toContain(summaryFallback);

    expect(pageText).not.toContain("你的小说项目");
  });
});
