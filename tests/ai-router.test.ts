import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/lib/ai/client";

type MockEnv = {
  dmxApiKey?: string;
  dmxBaseUrl?: string;
  dmxModelKimi?: string;
  dmxModelGlm?: string;
  dmxModelMimo?: string;
  dmxModelMinimax?: string;
  dmxModelQwen?: string;
  kimiApiKey?: string;
  kimiBaseUrl?: string;
  kimiModel?: string;
  glmApiKey?: string;
  glmBaseUrl?: string;
  glmModel?: string;
  qwenApiKey?: string;
  qwenBaseUrl?: string;
  qwenModel?: string;
  deepseekApiKey?: string;
  deepseekBaseUrl?: string;
  deepseekModel?: string;
  llmApiKey?: string;
  llmBaseUrl?: string;
  llmModel?: string;
};

const { invokeJsonChatModel, mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    dmxApiKey: "dmx-key",
    dmxBaseUrl: "https://dmx.example/v1",
    dmxModelKimi: "kimi-k2.6-free",
    dmxModelGlm: "glm-5.1-free",
    dmxModelMimo: "mimo-v2.5-free",
    dmxModelMinimax: "MiniMax-M2.7-free",
    dmxModelQwen: "qwen3.5-plus-free",
    kimiApiKey: "kimi-key",
    kimiBaseUrl: "https://api.moonshot.cn/v1",
    kimiModel: "moonshot-v1-8k",
    glmApiKey: "glm-key",
    glmBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    glmModel: "glm-4.5-air",
    qwenApiKey: "qwen-key",
    qwenBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    qwenModel: "qwen-plus",
    deepseekApiKey: "deepseek-key",
    deepseekBaseUrl: "https://api.deepseek.com",
    deepseekModel: "deepseek-v4-flash",
    llmApiKey: "fallback-key",
    llmBaseUrl: "https://fallback.example/v1",
    llmModel: "fallback-model"
  } as MockEnv,
  invokeJsonChatModel: vi.fn()
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv
}));

vi.mock("@/lib/ai/client", () => ({
  invokeJsonChatModel
}));

import { callRoutedJsonModel } from "@/lib/ai/router";

const messages: ChatMessage[] = [{ role: "user", content: "只返回 JSON" }];
const expectedAutoRouteModels = [
  "kimi-k2.6-free",
  "moonshot-v1-8k",
  "glm-5.1-free",
  "glm-4.5-air",
  "mimo-v2.5-free",
  "MiniMax-M2.7-free",
  "qwen3.5-plus-free",
  "qwen-plus",
  "deepseek-v4-flash",
  "fallback-model"
] as const;

describe("callRoutedJsonModel", () => {
  beforeEach(() => {
    invokeJsonChatModel.mockReset();
    Object.assign(mockEnv, {
      dmxApiKey: "dmx-key",
      dmxBaseUrl: "https://dmx.example/v1",
      dmxModelKimi: "kimi-k2.6-free",
      dmxModelGlm: "glm-5.1-free",
      dmxModelMimo: "mimo-v2.5-free",
      dmxModelMinimax: "MiniMax-M2.7-free",
      dmxModelQwen: "qwen3.5-plus-free",
      kimiApiKey: "kimi-key",
      kimiBaseUrl: "https://api.moonshot.cn/v1",
      kimiModel: "moonshot-v1-8k",
      glmApiKey: "glm-key",
      glmBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
      glmModel: "glm-4.5-air",
      qwenApiKey: "qwen-key",
      qwenBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      qwenModel: "qwen-plus",
      deepseekApiKey: "deepseek-key",
      deepseekBaseUrl: "https://api.deepseek.com",
      deepseekModel: "deepseek-v4-flash",
      llmApiKey: "fallback-key",
      llmBaseUrl: "https://fallback.example/v1",
      llmModel: "fallback-model"
    });
  });

  it("falls back through the ordered providers in auto mode", async () => {
    invokeJsonChatModel
      .mockRejectedValueOnce(new Error("kimi failed"))
      .mockRejectedValueOnce(new Error("kimi official failed"))
      .mockRejectedValueOnce(new Error("glm failed"))
      .mockRejectedValueOnce(new Error("glm official failed"))
      .mockRejectedValueOnce(new Error("mimo failed"))
      .mockRejectedValueOnce(new Error("minimax failed"))
      .mockRejectedValueOnce(new Error("qwen failed"))
      .mockRejectedValueOnce(new Error("qwen official failed"))
      .mockRejectedValueOnce(new Error("deepseek failed"))
      .mockResolvedValueOnce({ ok: true, provider: "fallback" });

    const result = await callRoutedJsonModel({
      messages,
      modelSelection: "auto"
    });

    expect(invokeJsonChatModel).toHaveBeenCalledTimes(10);
    expect(invokeJsonChatModel.mock.calls.map(([options]) => options.model)).toEqual(
      expectedAutoRouteModels
    );
    expect(result).toEqual({
      payload: { ok: true, provider: "fallback" },
      meta: {
        requestedModel: "auto",
        resolvedProvider: "fallback",
        resolvedModel: "fallback-model",
        usedFallback: true
      }
    });
  });

  it("continues from the selected route into the shared fallback chain in manual mode", async () => {
    invokeJsonChatModel
      .mockRejectedValueOnce(new Error("glm failed"))
      .mockRejectedValueOnce(new Error("glm official failed"))
      .mockResolvedValueOnce({ ok: true, provider: "fallback" });

    await expect(
      callRoutedJsonModel({
        messages,
        modelSelection: "glm"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        payload: { ok: true, provider: "fallback" },
        meta: expect.objectContaining({
          requestedModel: "glm",
          resolvedProvider: "fallback",
          usedFallback: true
        })
      })
    );

    expect(invokeJsonChatModel.mock.calls.map(([options]) => options.model)).toEqual([
      "glm-5.1-free",
      "glm-4.5-air",
      "fallback-model"
    ]);
  });

  it("falls back to the official provider within the selected route in manual mode", async () => {
    invokeJsonChatModel
      .mockRejectedValueOnce(new Error("kimi failed"))
      .mockResolvedValueOnce({ ok: true, provider: "official-kimi" });

    await expect(
      callRoutedJsonModel({
        messages,
        modelSelection: "kimi"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        meta: expect.objectContaining({
          resolvedProvider: "official-kimi"
        })
      })
    );

    expect(invokeJsonChatModel).toHaveBeenCalledTimes(2);
    expect(invokeJsonChatModel.mock.calls.map(([options]) => options.model)).toEqual([
      "kimi-k2.6-free",
      "moonshot-v1-8k"
    ]);
    expect(invokeJsonChatModel.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        baseUrl: "https://dmx.example/v1",
        apiKey: "dmx-key",
        model: "kimi-k2.6-free"
      })
    );
    expect(invokeJsonChatModel.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        baseUrl: "https://api.moonshot.cn/v1",
        apiKey: "kimi-key",
        model: "moonshot-v1-8k"
      })
    );
  });

  it("continues into fallback when the manually selected route is entirely unconfigured", async () => {
    mockEnv.dmxApiKey = undefined;
    mockEnv.glmApiKey = undefined;
    invokeJsonChatModel.mockResolvedValueOnce({ ok: true, provider: "fallback" });

    await expect(
      callRoutedJsonModel({
        messages,
        modelSelection: "glm"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        payload: { ok: true, provider: "fallback" },
        meta: expect.objectContaining({
          requestedModel: "glm",
          resolvedProvider: "fallback",
          resolvedModel: "fallback-model",
          usedFallback: true
        })
      })
    );

    expect(invokeJsonChatModel).toHaveBeenCalledTimes(1);
    expect(invokeJsonChatModel).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://fallback.example/v1",
        apiKey: "fallback-key",
        model: "fallback-model"
      })
    );
  });

  it("treats missing model metadata as unconfigured but still uses fallback in manual mode", async () => {
    mockEnv.dmxModelGlm = "";
    mockEnv.glmModel = "";
    invokeJsonChatModel.mockResolvedValueOnce({ ok: true, provider: "fallback" });

    await expect(
      callRoutedJsonModel({
        messages,
        modelSelection: "glm"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        payload: { ok: true, provider: "fallback" },
        meta: expect.objectContaining({
          requestedModel: "glm",
          resolvedProvider: "fallback",
          usedFallback: true
        })
      })
    );

    expect(invokeJsonChatModel).toHaveBeenCalledTimes(1);
    expect(invokeJsonChatModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "fallback-model"
      })
    );
  });

  it("uses fallback when mimo is manually selected but its route is unconfigured", async () => {
    mockEnv.dmxApiKey = undefined;
    invokeJsonChatModel.mockResolvedValueOnce({ ok: true, provider: "fallback" });

    await expect(
      callRoutedJsonModel({
        messages,
        modelSelection: "mimo"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        payload: { ok: true, provider: "fallback" },
        meta: expect.objectContaining({
          requestedModel: "mimo",
          resolvedProvider: "fallback",
          resolvedModel: "fallback-model",
          usedFallback: true
        })
      })
    );

    expect(invokeJsonChatModel).toHaveBeenCalledTimes(1);
    expect(invokeJsonChatModel).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://fallback.example/v1",
        apiKey: "fallback-key",
        model: "fallback-model"
      })
    );
  });

  it("uses fallback when minimax is manually selected but its route is unconfigured", async () => {
    mockEnv.dmxApiKey = undefined;
    invokeJsonChatModel.mockResolvedValueOnce({ ok: true, provider: "fallback" });

    await expect(
      callRoutedJsonModel({
        messages,
        modelSelection: "minimax"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        payload: { ok: true, provider: "fallback" },
        meta: expect.objectContaining({
          requestedModel: "minimax",
          resolvedProvider: "fallback",
          resolvedModel: "fallback-model",
          usedFallback: true
        })
      })
    );

    expect(invokeJsonChatModel).toHaveBeenCalledTimes(1);
    expect(invokeJsonChatModel).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://fallback.example/v1",
        apiKey: "fallback-key",
        model: "fallback-model"
      })
    );
  });

  it("uses fallback when deepseek is manually selected but its route is unconfigured", async () => {
    mockEnv.deepseekApiKey = undefined;
    invokeJsonChatModel.mockResolvedValueOnce({ ok: true, provider: "fallback" });

    await expect(
      callRoutedJsonModel({
        messages,
        modelSelection: "deepseek"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        payload: { ok: true, provider: "fallback" },
        meta: expect.objectContaining({
          requestedModel: "deepseek",
          resolvedProvider: "fallback",
          resolvedModel: "fallback-model",
          usedFallback: true
        })
      })
    );

    expect(invokeJsonChatModel).toHaveBeenCalledTimes(1);
    expect(invokeJsonChatModel).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://fallback.example/v1",
        apiKey: "fallback-key",
        model: "fallback-model"
      })
    );
  });

  it("still fails in manual mode when both the selected route and fallback are unconfigured", async () => {
    mockEnv.deepseekApiKey = undefined;
    mockEnv.llmApiKey = undefined;

    await expect(
      callRoutedJsonModel({
        messages,
        modelSelection: "deepseek"
      })
    ).rejects.toThrow("All model providers failed.");

    expect(invokeJsonChatModel).not.toHaveBeenCalled();
  });

  it("skips unconfigured providers in auto mode", async () => {
    mockEnv.dmxApiKey = undefined;
    mockEnv.kimiApiKey = undefined;
    mockEnv.glmApiKey = undefined;
    mockEnv.qwenApiKey = undefined;
    mockEnv.deepseekApiKey = undefined;
    invokeJsonChatModel.mockResolvedValueOnce({ ok: true, provider: "fallback" });

    const result = await callRoutedJsonModel({
      messages,
      modelSelection: "auto"
    });

    expect(invokeJsonChatModel).toHaveBeenCalledTimes(1);
    expect(invokeJsonChatModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "fallback-model"
      })
    );
    expect(result.meta.resolvedProvider).toBe("fallback");
  });

  it("skips providers missing baseUrl or model in auto mode", async () => {
    mockEnv.dmxBaseUrl = "";
    mockEnv.kimiBaseUrl = "";
    mockEnv.glmModel = "";
    mockEnv.dmxModelMimo = "";
    mockEnv.dmxModelMinimax = "";
    mockEnv.qwenBaseUrl = "";
    mockEnv.deepseekBaseUrl = "";
    invokeJsonChatModel.mockResolvedValueOnce({ ok: true, provider: "fallback" });

    const result = await callRoutedJsonModel({
      messages,
      modelSelection: "auto"
    });

    expect(invokeJsonChatModel).toHaveBeenCalledTimes(1);
    expect(invokeJsonChatModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "fallback-model"
      })
    );
    expect(result.meta.resolvedProvider).toBe("fallback");
  });
  
  it("throws an aggregated error when all providers fail in auto mode", async () => {
    invokeJsonChatModel
      .mockRejectedValueOnce(new Error("kimi failed"))
      .mockRejectedValueOnce(new Error("kimi official failed"))
      .mockRejectedValueOnce(new Error("glm failed"))
      .mockRejectedValueOnce(new Error("glm official failed"))
      .mockRejectedValueOnce(new Error("mimo failed"))
      .mockRejectedValueOnce(new Error("minimax failed"))
      .mockRejectedValueOnce(new Error("qwen failed"))
      .mockRejectedValueOnce(new Error("qwen official failed"))
      .mockRejectedValueOnce(new Error("deepseek failed"))
      .mockRejectedValueOnce(new Error("fallback failed"));

    const error = await callRoutedJsonModel({
        messages,
        modelSelection: "auto"
      })
      .then(() => undefined)
      .catch((value: unknown) => value);

    expect(error).toBeInstanceOf(Error);
    expect(invokeJsonChatModel).toHaveBeenCalledTimes(10);
    expect(invokeJsonChatModel.mock.calls.map(([options]) => options.model)).toEqual(
      expectedAutoRouteModels
    );
    expect((error as Error).message).toContain("All model providers failed.");
    expect((error as Error).message).toContain("dmx-kimi: kimi failed");
    expect((error as Error).message).toContain("official-kimi: kimi official failed");
    expect((error as Error).message).toContain("dmx-glm: glm failed");
    expect((error as Error).message).toContain("official-glm: glm official failed");
    expect((error as Error).message).toContain("dmx-minimax: minimax failed");
    expect((error as Error).message).toContain("dmx-qwen: qwen failed");
    expect((error as Error).message).toContain("official-qwen: qwen official failed");
    expect((error as Error).message).toContain("deepseek-official: deepseek failed");
    expect((error as Error).message).toContain("fallback: fallback failed");
  });
});
