import React from "react";
import { describe, expect, it, vi } from "vitest";
import InsightsPage from "@/app/novels/[novelSlug]/insights/page";

globalThis.React = React;

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  })
}));

vi.mock("next/navigation", () => ({
  redirect
}));

describe("InsightsPage", () => {
  it("redirects old strategy links back to the overview page", async () => {
    await expect(
      InsightsPage({
        params: { novelSlug: "glass-city" }
      })
    ).rejects.toThrow("NEXT_REDIRECT:/novels/glass-city");

    expect(redirect).toHaveBeenCalledWith("/novels/glass-city");
  });
});
