import { afterEach, describe, expect, it, vi } from "vitest";
import { extractJsonPayload, invokeJsonChatModel } from "@/lib/ai/client";

describe("extractJsonPayload", () => {
  it("parses fenced json blocks", () => {
    const payload = extractJsonPayload("```json\n{\"ok\":true,\"count\":2}\n```");

    expect(payload).toEqual({
      ok: true,
      count: 2
    });
  });

  it("parses raw json strings without fenced code blocks", () => {
    const payload = extractJsonPayload("{\"ok\":true,\"count\":3}");

    expect(payload).toEqual({
      ok: true,
      count: 3
    });
  });

  it("throws when no json payload is present", () => {
    expect(() => extractJsonPayload("not json at all")).toThrow(
      "No JSON payload found in model response."
    );
  });
});

describe("invokeJsonChatModel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("omits chat_template_kwargs when no provider extras are needed", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "{\"ok\":true}" } }]
      })
    }));

    vi.stubGlobal("fetch", fetchMock);

    await invokeJsonChatModel({
      baseUrl: "https://example.com/v1",
      apiKey: "key",
      model: "test-model",
      temperature: 0.7,
      topP: 1,
      messages: [{ role: "user", content: "只返回 JSON" }]
    });

    const calls = fetchMock.mock.calls as Array<unknown[]>;
    const requestInit = calls[0]?.[1] as RequestInit | undefined;

    if (!requestInit) {
      throw new Error("Request init was not captured.");
    }

    const body = JSON.parse(String(requestInit.body));

    expect(body).not.toHaveProperty("chat_template_kwargs");
  });
});
