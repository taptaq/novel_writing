import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  state: {
    isDatabaseConfigured: true
  },
  prisma: {
    novel: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("@/lib/env", () => ({
  get isDatabaseConfigured() {
    return mocks.state.isDatabaseConfigured;
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

import { getNovelSummariesWithSource } from "@/lib/repositories/novels";

describe("getNovelSummariesWithSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.isDatabaseConfigured = true;
  });

  it("falls back to demo summaries when the database is not configured", async () => {
    mocks.state.isDatabaseConfigured = false;

    const result = await getNovelSummariesWithSource();

    expect(result.source).toBe("demo");
    expect(result.novels).toHaveLength(1);
    expect(result.novels[0]?.slug).toBe("tide-and-embers");
    expect(mocks.prisma.novel.findMany).not.toHaveBeenCalled();
  });

  it("falls back to demo summaries when the database returns no novels", async () => {
    mocks.prisma.novel.findMany.mockResolvedValueOnce([]);

    const result = await getNovelSummariesWithSource();

    expect(mocks.prisma.novel.findMany).toHaveBeenCalledWith({
      include: {
        chapters: {
          select: {
            wordCount: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });
    expect(result.source).toBe("demo");
    expect(result.novels[0]?.slug).toBe("tide-and-embers");
  });

  it("falls back to demo summaries when the database query throws", async () => {
    mocks.prisma.novel.findMany.mockRejectedValueOnce(new Error("database offline"));

    const result = await getNovelSummariesWithSource();

    expect(result.source).toBe("demo");
    expect(result.novels[0]?.slug).toBe("tide-and-embers");
  });

  it("returns database summaries and keeps the repository ordering contract", async () => {
    mocks.prisma.novel.findMany.mockResolvedValueOnce([
      {
        id: "novel-1",
        slug: "glass-city",
        title: "玻璃城遗闻",
        premise: "档案修复师进入玻璃废墟。",
        summary: "她要在玻璃城彻底塌陷前找回姐姐留下的第二份遗嘱。",
        genre: "都市奇想",
        tone: "克制冷感",
        lengthCategory: "LONG",
        status: "DRAFTING",
        updatedAt: new Date("2026-04-27T00:00:00.000Z"),
        chapters: [{ wordCount: 1200 }, { wordCount: 800 }]
      }
    ]);

    const result = await getNovelSummariesWithSource();

    expect(mocks.prisma.novel.findMany).toHaveBeenCalledWith({
      include: {
        chapters: {
          select: {
            wordCount: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });
    expect(result).toEqual({
      source: "database",
      novels: [
        {
          id: "novel-1",
          slug: "glass-city",
          title: "玻璃城遗闻",
          premise: "档案修复师进入玻璃废墟。",
          summary: "她要在玻璃城彻底塌陷前找回姐姐留下的第二份遗嘱。",
          genre: "都市奇想",
          tone: "克制冷感",
          lengthCategory: "LONG",
          status: "DRAFTING",
          updatedAt: "2026-04-27T00:00:00.000Z",
          chapterCount: 2,
          wordCount: 2000
        }
      ]
    });
  });
});
