import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    novel: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("@/lib/env", () => ({
  isDatabaseConfigured: true
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

import {
  getNovelWorkspace,
  isNovelWorkspaceRepositoryError
} from "@/lib/repositories/novels";

describe("getNovelWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to a minimal workspace query when the rich workspace query fails", async () => {
    mocks.prisma.novel.findUnique
      .mockRejectedValueOnce(new Error('column "voiceRules" does not exist'))
      .mockResolvedValueOnce({
        id: "novel-1",
        slug: "glass-city",
        title: "玻璃城遗闻",
        premise: "档案修复师进入玻璃废墟。",
        summary: "她要在玻璃城彻底塌陷前找回姐姐留下的第二份遗嘱。",
        genre: "都市奇想",
        tone: "克制冷感",
        lengthCategory: "LONG",
        status: "PLANNING",
        updatedAt: new Date("2026-05-07T00:00:00.000Z"),
        chapters: [
          {
            id: "chapter-1",
            slug: "cold-rain",
            title: "冷雨开场",
            summary: "主角在雨里等一句没说完的话。",
            order: 1,
            status: "DRAFT",
            wordCount: 2200
          }
        ]
      });

    const workspace = await getNovelWorkspace("glass-city");

    expect(mocks.prisma.novel.findUnique).toHaveBeenCalledTimes(2);
    expect(workspace).toEqual({
      novel: {
        id: "novel-1",
        slug: "glass-city",
        title: "玻璃城遗闻",
        premise: "档案修复师进入玻璃废墟。",
        summary: "她要在玻璃城彻底塌陷前找回姐姐留下的第二份遗嘱。",
        genre: "都市奇想",
        tone: "克制冷感",
        lengthCategory: "LONG",
        status: "PLANNING",
        updatedAt: "2026-05-07T00:00:00.000Z",
        chapterCount: 1,
        wordCount: 2200
      },
      voiceRules: [],
      chapters: [
        {
          id: "chapter-1",
          slug: "cold-rain",
          title: "冷雨开场",
          summary: "主角在雨里等一句没说完的话。",
          sceneGoal: undefined,
          order: 1,
          status: "DRAFT",
          wordCount: 2200,
          excerpt: undefined
        }
      ],
      entities: [],
      outlines: [],
      foreshadows: []
    });
  });

  it("throws a repository error when both rich and fallback workspace queries fail", async () => {
    mocks.prisma.novel.findUnique
      .mockRejectedValueOnce(new Error('column "voiceRules" does not exist'))
      .mockRejectedValueOnce(new Error('column "summary" does not exist'));

    await expect(getNovelWorkspace("glass-city")).rejects.toSatisfy((error: unknown) => {
      expect(isNovelWorkspaceRepositoryError(error)).toBe(true);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("WORKSPACE_READ_FAILED");
      return true;
    });
  });
});
