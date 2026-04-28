import { ZodError } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NovelStyleRepositoryError } from "@/lib/novel-style";

const mocks = vi.hoisted(() => ({
  getNovelStyleWorkspace: vi.fn(),
  updateNovelStyleProfile: vi.fn(),
  addNovelStyleSample: vi.fn(),
  rebuildNovelStyleProfile: vi.fn()
}));

vi.mock("@/lib/repositories/novels", () => ({
  getNovelStyleWorkspace: mocks.getNovelStyleWorkspace,
  updateNovelStyleProfile: mocks.updateNovelStyleProfile,
  addNovelStyleSample: mocks.addNovelStyleSample,
  rebuildNovelStyleProfile: mocks.rebuildNovelStyleProfile
}));

import { GET, PATCH } from "@/app/api/novels/[novelSlug]/style/route";
import { POST as createSample } from "@/app/api/novels/[novelSlug]/style/samples/route";
import { POST as rebuildStyle } from "@/app/api/novels/[novelSlug]/style/rebuild/route";

function buildRequest(url: string, method: string, body?: Record<string, unknown>) {
  return new Request(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body
      ? {
          "Content-Type": "application/json"
        }
      : undefined
  });
}

describe("novel style routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns workspace from GET /api/novels/[novelSlug]/style", async () => {
    mocks.getNovelStyleWorkspace.mockResolvedValue({
      novel: {
        id: "novel-1",
        slug: "glass-city",
        title: "玻璃城遗闻",
        status: "DRAFTING",
        updatedAt: "2026-04-27T00:00:00.000Z",
        chapterCount: 3,
        wordCount: 9600
      },
      profile: {
        styleSummary: "冷感贴身视角",
        styleRules: ["动作先于解释"],
        avoidRules: [],
        dialogueRules: [],
        narrationRules: [],
        rhythmRules: [],
        imageryRules: [],
        status: "READY"
      },
      samples: []
    });

    const response = await GET(new Request("http://localhost/api/novels/glass-city/style"), {
      params: { novelSlug: "glass-city" }
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      workspace: expect.objectContaining({
        novel: expect.objectContaining({
          slug: "glass-city"
        }),
        profile: expect.objectContaining({
          status: "READY"
        })
      })
    });
  });

  it("accepts manual profile edits in PATCH /api/novels/[novelSlug]/style", async () => {
    mocks.updateNovelStyleProfile.mockResolvedValue({
      id: "profile-1",
      styleSummary: "克制冷感",
      styleRules: ["动作先于解释"],
      avoidRules: ["不要金句收尾"],
      dialogueRules: [],
      narrationRules: [],
      rhythmRules: [],
      imageryRules: [],
      status: "READY",
      lastGeneratedAt: "2026-04-27T06:00:00.000Z"
    });

    const response = await PATCH(
      buildRequest("http://localhost/api/novels/glass-city/style", "PATCH", {
        styleSummary: "克制冷感",
        styleRules: ["动作先于解释"],
        avoidRules: ["不要金句收尾"],
        status: "READY"
      }),
      {
        params: { novelSlug: "glass-city" }
      }
    );

    expect(mocks.updateNovelStyleProfile).toHaveBeenCalledWith("glass-city", {
      styleSummary: "克制冷感",
      styleRules: ["动作先于解释"],
      avoidRules: ["不要金句收尾"],
      status: "READY"
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: expect.objectContaining({
        id: "profile-1",
        status: "READY"
      })
    });
  });

  it("creates a style sample with 201 in POST /api/novels/[novelSlug]/style/samples", async () => {
    mocks.addNovelStyleSample.mockResolvedValue({
      id: "sample-1",
      title: "冷雨开场",
      sourceType: "MANUAL_PASTE",
      content: "她没有立刻回头，只是把灯绳又绕了一圈，等雨声先落稳，再去听门外那句没说完的话。",
      note: "偏克制、停顿多",
      isActive: true,
      createdAt: "2026-04-27T01:00:00.000Z"
    });

    const payload = {
      title: "冷雨开场",
      content: "她没有立刻回头，只是把灯绳又绕了一圈，等雨声先落稳，再去听门外那句没说完的话。",
      note: "偏克制、停顿多"
    };

    const response = await createSample(
      buildRequest("http://localhost/api/novels/glass-city/style/samples", "POST", payload),
      {
        params: { novelSlug: "glass-city" }
      }
    );

    expect(mocks.addNovelStyleSample).toHaveBeenCalledWith("glass-city", payload);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      sample: expect.objectContaining({
        id: "sample-1",
        sourceType: "MANUAL_PASTE"
      })
    });
  });

  it("triggers rebuild in POST /api/novels/[novelSlug]/style/rebuild", async () => {
    mocks.rebuildNovelStyleProfile.mockResolvedValue({
      id: "profile-1",
      styleSummary: "当前已有参考样文，建议手动补充规则后再用于稳定续写。",
      styleRules: [],
      avoidRules: [],
      dialogueRules: [],
      narrationRules: [],
      rhythmRules: [],
      imageryRules: [],
      status: "FAILED",
      lastGeneratedAt: "2026-04-27T07:00:00.000Z"
    });

    const response = await rebuildStyle(
      buildRequest("http://localhost/api/novels/glass-city/style/rebuild", "POST"),
      {
        params: { novelSlug: "glass-city" }
      }
    );

    expect(mocks.rebuildNovelStyleProfile).toHaveBeenCalledWith("glass-city");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      profile: expect.objectContaining({
        status: "FAILED"
      })
    });
  });

  it("returns 404 when workspace route cannot find a novel", async () => {
    mocks.getNovelStyleWorkspace.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/novels/missing/style"), {
      params: { novelSlug: "missing" }
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Novel not found."
    });
  });

  it("returns 503 when GET style workspace hits an unconfigured database", async () => {
    mocks.getNovelStyleWorkspace.mockRejectedValue(
      new NovelStyleRepositoryError("DATABASE_NOT_CONFIGURED")
    );

    const response = await GET(new Request("http://localhost/api/novels/glass-city/style"), {
      params: { novelSlug: "glass-city" }
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "数据库未配置，暂时无法读取文风资产。"
    });
  });

  it("returns 404 when PATCH style profile cannot find the novel", async () => {
    mocks.updateNovelStyleProfile.mockRejectedValue(
      new NovelStyleRepositoryError("NOVEL_NOT_FOUND")
    );

    const response = await PATCH(
      buildRequest("http://localhost/api/novels/missing/style", "PATCH", {
        styleSummary: "克制冷感"
      }),
      {
        params: { novelSlug: "missing" }
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: "Novel not found."
    });
  });

  it("returns 500 when PATCH style profile fails unexpectedly", async () => {
    mocks.updateNovelStyleProfile.mockRejectedValue(new Error("boom"));

    const response = await PATCH(
      buildRequest("http://localhost/api/novels/glass-city/style", "PATCH", {
        styleSummary: "克制冷感"
      }),
      {
        params: { novelSlug: "glass-city" }
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "更新文风画像失败"
    });
  });

  it("returns 400 when PATCH style profile receives invalid JSON", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/novels/glass-city/style", {
        method: "PATCH",
        body: "{invalid-json",
        headers: {
          "Content-Type": "application/json"
        }
      }),
      {
        params: { novelSlug: "glass-city" }
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "请求体不是有效的 JSON。"
    });
  });

  it("returns 503 when rebuild hits an unconfigured database", async () => {
    mocks.rebuildNovelStyleProfile.mockRejectedValue(
      new NovelStyleRepositoryError("DATABASE_NOT_CONFIGURED")
    );

    const response = await rebuildStyle(
      buildRequest("http://localhost/api/novels/glass-city/style/rebuild", "POST"),
      {
        params: { novelSlug: "glass-city" }
      }
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "数据库未配置，暂时无法重建文风画像。"
    });
  });

  it("returns 500 when rebuild fails unexpectedly", async () => {
    mocks.rebuildNovelStyleProfile.mockRejectedValue(new Error("boom"));

    const response = await rebuildStyle(
      buildRequest("http://localhost/api/novels/glass-city/style/rebuild", "POST"),
      {
        params: { novelSlug: "glass-city" }
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "重建文风画像失败"
    });
  });

  it("returns 400 for sample validation failures", async () => {
    mocks.addNovelStyleSample.mockRejectedValue(
      new ZodError([
        {
          code: "too_small",
          minimum: 20,
          inclusive: true,
          path: ["content"],
          type: "string",
          message: "参考样文至少需要 20 个字符"
        }
      ])
    );

    const response = await createSample(
      buildRequest("http://localhost/api/novels/glass-city/style/samples", "POST", {
        content: "太短了"
      }),
      {
        params: { novelSlug: "glass-city" }
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "风格参考样文校验失败",
      issues: expect.any(Array)
    });
  });
});
