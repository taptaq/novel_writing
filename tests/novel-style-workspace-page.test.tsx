import React from "react";
import { describe, expect, it, vi } from "vitest";
import NovelStylePage from "@/app/novels/[novelSlug]/style/page";

globalThis.React = React;

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  })
}));

vi.mock("@/lib/repositories/novels", () => ({
  getNovelStyleWorkspace: vi.fn(async () => null)
}));

describe("NovelStylePage", () => {
  it("uses notFound when the real workspace cannot be loaded", async () => {
    await expect(
      NovelStylePage({
        params: { novelSlug: "tide-and-embers" }
      })
    ).rejects.toThrow("NOT_FOUND");
  });
});
