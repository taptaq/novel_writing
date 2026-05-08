import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createChapter: vi.fn(),
  saveChapterDraft: vi.fn(),
  isChapterRepositoryError: vi.fn((error: unknown) => {
    return Boolean(error && typeof error === "object" && "code" in error);
  })
}));

vi.mock("@/lib/repositories/novels", () => ({
  createChapter: mocks.createChapter,
  saveChapterDraft: mocks.saveChapterDraft,
  isChapterRepositoryError: mocks.isChapterRepositoryError
}));

import { PATCH } from "@/app/api/novels/[novelSlug]/chapters/[chapterSlug]/route";

async function importChapterCreateRoute() {
  return import("@/app/api/novels/[novelSlug]/chapters/route");
}

function buildRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function buildCreateRequest(url: string) {
  return new Request(url, {
    method: "POST"
  });
}

describe("novel chapter create route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isChapterRepositoryError.mockImplementation((error: unknown) => {
      return Boolean(error && typeof error === "object" && "code" in error);
    });
  });

  it("creates the next chapter and returns slug title and order", async () => {
    mocks.createChapter.mockResolvedValue({
      chapter: {
        slug: "chapter-3",
        title: "第 3 章",
        order: 3
      }
    });

    const { POST } = await importChapterCreateRoute();
    const response = await POST(buildCreateRequest("http://localhost/api/novels/glass-city/chapters"), {
      params: { novelSlug: "glass-city" }
    });

    expect(response.status).toBe(200);
    expect(mocks.createChapter).toHaveBeenCalledWith("glass-city");
    await expect(response.json()).resolves.toEqual({
      chapter: {
        slug: "chapter-3",
        title: "第 3 章",
        order: 3
      }
    });
  });

  it("returns 404 when the novel is missing", async () => {
    mocks.createChapter.mockRejectedValue({ code: "NOVEL_NOT_FOUND" });

    const { POST } = await importChapterCreateRoute();
    const response = await POST(buildCreateRequest("http://localhost/api/novels/missing/chapters"), {
      params: { novelSlug: "missing" }
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Novel not found."
    });
  });

  it("falls back to 500 when the repository reports database not configured", async () => {
    mocks.createChapter.mockRejectedValue({ code: "DATABASE_NOT_CONFIGURED" });

    const { POST } = await importChapterCreateRoute();
    const response = await POST(buildCreateRequest("http://localhost/api/novels/glass-city/chapters"), {
      params: { novelSlug: "glass-city" }
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "创建章节失败"
    });
  });

  it("returns 500 for unexpected create errors", async () => {
    mocks.createChapter.mockRejectedValue(new Error("boom"));

    const { POST } = await importChapterCreateRoute();
    const response = await POST(buildCreateRequest("http://localhost/api/novels/glass-city/chapters"), {
      params: { novelSlug: "glass-city" }
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "创建章节失败"
    });
  });
});

describe("novel chapter save route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isChapterRepositoryError.mockImplementation((error: unknown) => {
      return Boolean(error && typeof error === "object" && "code" in error);
    });
  });

  it("updates chapter plainText and creates a manual version", async () => {
    mocks.saveChapterDraft.mockResolvedValue({
      chapter: {
        title: "雨夜回声",
        slug: "cold-rain",
        wordCount: 1350,
        updatedAt: "2026-04-29T10:00:00.000Z"
      },
      version: {
        id: "version-3",
        source: "manual",
        createdAt: "2026-04-29T10:00:00.000Z",
        wordCount: 1350
      }
    });

    const response = await PATCH(
      buildRequest("http://localhost/api/novels/glass-city/chapters/cold-rain", {
        title: "雨夜回声",
        plainText: "她没有立刻回头，只是把灯绳又绕了一圈。",
        source: "manual",
        expectedUpdatedAt: "2026-04-29T09:58:00.000Z"
      }),
      {
        params: { novelSlug: "glass-city", chapterSlug: "cold-rain" }
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.saveChapterDraft).toHaveBeenCalledWith("glass-city", "cold-rain", {
      title: "雨夜回声",
      plainText: "她没有立刻回头，只是把灯绳又绕了一圈。",
      source: "manual",
      expectedUpdatedAt: "2026-04-29T09:58:00.000Z"
    });
    await expect(response.json()).resolves.toEqual({
      chapter: {
        title: "雨夜回声",
        slug: "cold-rain",
        wordCount: 1350,
        updatedAt: "2026-04-29T10:00:00.000Z"
      },
      version: {
        id: "version-3",
        source: "manual",
        createdAt: "2026-04-29T10:00:00.000Z",
        wordCount: 1350
      }
    });
  });

  it("accepts autosave requests and returns a null version", async () => {
    mocks.saveChapterDraft.mockResolvedValue({
      chapter: {
        title: "第三声钟响前",
        slug: "cold-rain",
        wordCount: 1362,
        updatedAt: "2026-04-29T10:02:00.000Z"
      },
      version: null
    });

    const response = await PATCH(
      buildRequest("http://localhost/api/novels/glass-city/chapters/cold-rain", {
        title: "第三声钟响前",
        plainText: "她没有立刻回头，只是把灯绳又绕了一圈。",
        source: "autosave",
        expectedUpdatedAt: "2026-04-29T10:00:00.000Z"
      }),
      {
        params: { novelSlug: "glass-city", chapterSlug: "cold-rain" }
      }
    );

    expect(response.status).toBe(200);
    expect(mocks.saveChapterDraft).toHaveBeenCalledWith("glass-city", "cold-rain", {
      title: "第三声钟响前",
      plainText: "她没有立刻回头，只是把灯绳又绕了一圈。",
      source: "autosave",
      expectedUpdatedAt: "2026-04-29T10:00:00.000Z"
    });
    await expect(response.json()).resolves.toEqual({
      chapter: {
        title: "第三声钟响前",
        slug: "cold-rain",
        wordCount: 1362,
        updatedAt: "2026-04-29T10:02:00.000Z"
      },
      version: null
    });
  });

  it("returns 400 for invalid chapter draft payload", async () => {
    const response = await PATCH(
      buildRequest("http://localhost/api/novels/glass-city/chapters/cold-rain", {
        title: "",
        source: "manual"
      }),
      {
        params: { novelSlug: "glass-city", chapterSlug: "cold-rain" }
      }
    );

    expect(response.status).toBe(400);
    expect(mocks.saveChapterDraft).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "章节保存参数校验失败",
      issues: expect.any(Array)
    });
  });

  it("returns 400 for invalid route params", async () => {
    const response = await PATCH(
      buildRequest("http://localhost/api/novels/glass-city/chapters/cold-rain", {
        plainText: "她没有立刻回头。",
        source: "manual"
      }),
      {
        params: { novelSlug: "", chapterSlug: "cold-rain" }
      }
    );

    expect(response.status).toBe(400);
    expect(mocks.saveChapterDraft).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "章节保存参数校验失败",
      issues: expect.any(Array)
    });
  });

  it("returns 404 when the novel is missing", async () => {
    mocks.saveChapterDraft.mockRejectedValue({ code: "NOVEL_NOT_FOUND" });

    const response = await PATCH(
      buildRequest("http://localhost/api/novels/missing/chapters/cold-rain", {
        title: "缺席章节",
        plainText: "她没有立刻回头。",
        source: "manual"
      }),
      {
        params: { novelSlug: "missing", chapterSlug: "cold-rain" }
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Novel not found."
    });
  });

  it("returns 404 when the chapter is missing", async () => {
    mocks.saveChapterDraft.mockRejectedValue({ code: "CHAPTER_NOT_FOUND" });

    const response = await PATCH(
      buildRequest("http://localhost/api/novels/glass-city/chapters/missing", {
        title: "丢失章节",
        plainText: "她没有立刻回头。",
        source: "manual"
      }),
      {
        params: { novelSlug: "glass-city", chapterSlug: "missing" }
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Chapter not found."
    });
  });

  it("returns 409 when the draft is stale", async () => {
    mocks.saveChapterDraft.mockRejectedValue({ code: "STALE_CHAPTER_DRAFT" });

    const response = await PATCH(
      buildRequest("http://localhost/api/novels/glass-city/chapters/cold-rain", {
        title: "第三声钟响前",
        plainText: "她没有立刻回头。",
        source: "manual",
        expectedUpdatedAt: "2026-04-29T10:00:00.000Z"
      }),
      {
        params: { novelSlug: "glass-city", chapterSlug: "cold-rain" }
      }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "这章在别处被改过，请刷新后再继续。"
    });
  });

  it("returns 503 when the database is not configured", async () => {
    mocks.saveChapterDraft.mockRejectedValue({ code: "DATABASE_NOT_CONFIGURED" });

    const response = await PATCH(
      buildRequest("http://localhost/api/novels/glass-city/chapters/cold-rain", {
        title: "第三声钟响前",
        plainText: "她没有立刻回头。",
        source: "autosave"
      }),
      {
        params: { novelSlug: "glass-city", chapterSlug: "cold-rain" }
      }
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "数据库未配置，暂时无法保存章节。"
    });
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/novels/glass-city/chapters/cold-rain", {
        method: "PATCH",
        body: "{invalid-json",
        headers: {
          "Content-Type": "application/json"
        }
      }),
      {
        params: { novelSlug: "glass-city", chapterSlug: "cold-rain" }
      }
    );

    expect(response.status).toBe(400);
    expect(mocks.saveChapterDraft).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      error: "请求体不是有效的 JSON。"
    });
  });

  it("returns 500 for unexpected save errors", async () => {
    mocks.saveChapterDraft.mockRejectedValue(new Error("boom"));

    const response = await PATCH(
      buildRequest("http://localhost/api/novels/glass-city/chapters/cold-rain", {
        title: "第三声钟响前",
        plainText: "她没有立刻回头。",
        source: "manual"
      }),
      {
        params: { novelSlug: "glass-city", chapterSlug: "cold-rain" }
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "保存章节失败"
    });
  });
});
