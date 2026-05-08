import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

globalThis.React = React;

const { redirect, notFound } = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  })
}));

const mocks = vi.hoisted(() => ({
  getNovelWorkspace: vi.fn(),
  createChapter: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect,
  notFound
}));

vi.mock("@/lib/repositories/novels", () => ({
  getNovelWorkspace: mocks.getNovelWorkspace,
  createChapter: mocks.createChapter
}));

import NovelWritePage from "@/app/novels/[novelSlug]/write/page";

describe("NovelWritePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to the existing first chapter when the novel already has one", async () => {
    mocks.getNovelWorkspace.mockResolvedValue({
      novel: {
        id: "novel-1",
        slug: "glass-city",
        title: "玻璃城遗闻",
        status: "DRAFTING",
        updatedAt: "2026-04-27T00:00:00.000Z",
        chapterCount: 1,
        wordCount: 1200
      },
      chapters: [
        {
          id: "chapter-1",
          slug: "cold-rain",
          title: "冷雨开场",
          order: 1,
          status: "DRAFT",
          wordCount: 1200
        }
      ],
      entities: [],
      outlines: [],
      foreshadows: [],
      voiceRules: []
    });

    await expect(
      NovelWritePage({
        params: { novelSlug: "glass-city" }
      })
    ).rejects.toThrow("NEXT_REDIRECT:/novels/glass-city/chapters/cold-rain");

    expect(mocks.createChapter).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/novels/glass-city/chapters/cold-rain");
  });

  it("creates the first chapter and redirects into the editor when the novel has none", async () => {
    mocks.getNovelWorkspace.mockResolvedValue({
      novel: {
        id: "novel-1",
        slug: "glass-city",
        title: "玻璃城遗闻",
        status: "PLANNING",
        updatedAt: "2026-04-27T00:00:00.000Z",
        chapterCount: 0,
        wordCount: 0
      },
      chapters: [],
      entities: [],
      outlines: [],
      foreshadows: [],
      voiceRules: []
    });
    mocks.createChapter.mockResolvedValue({
      chapter: {
        slug: "chapter-1",
        title: "第 1 章",
        order: 1
      }
    });

    await expect(
      NovelWritePage({
        params: { novelSlug: "glass-city" }
      })
    ).rejects.toThrow("NEXT_REDIRECT:/novels/glass-city/chapters/chapter-1");

    expect(mocks.createChapter).toHaveBeenCalledWith("glass-city");
    expect(redirect).toHaveBeenCalledWith("/novels/glass-city/chapters/chapter-1");
  });

  it("encodes unicode slugs before redirecting into the editor", async () => {
    mocks.getNovelWorkspace.mockResolvedValue({
      novel: {
        id: "novel-1",
        slug: "肤笼",
        title: "肤笼",
        status: "PLANNING",
        updatedAt: "2026-04-27T00:00:00.000Z",
        chapterCount: 0,
        wordCount: 0
      },
      chapters: [],
      entities: [],
      outlines: [],
      foreshadows: [],
      voiceRules: []
    });
    mocks.createChapter.mockResolvedValue({
      chapter: {
        slug: "chapter-1",
        title: "第 1 章",
        order: 1
      }
    });

    await expect(
      NovelWritePage({
        params: { novelSlug: "%E8%82%A4%E7%AC%BC" }
      })
    ).rejects.toThrow("NEXT_REDIRECT:/novels/%E8%82%A4%E7%AC%BC/chapters/chapter-1");

    expect(mocks.createChapter).toHaveBeenCalledWith("肤笼");
    expect(redirect).toHaveBeenCalledWith("/novels/%E8%82%A4%E7%AC%BC/chapters/chapter-1");
  });

  it("uses notFound when the workspace cannot be loaded", async () => {
    mocks.getNovelWorkspace.mockResolvedValue(null);

    await expect(
      NovelWritePage({
        params: { novelSlug: "missing" }
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.createChapter).not.toHaveBeenCalled();
  });
});
