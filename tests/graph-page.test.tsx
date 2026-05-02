import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GraphPage from "@/app/novels/[novelSlug]/graph/page";

globalThis.React = React;

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`NEXT_REDIRECT:${href}`);
  })
}));

vi.mock("next/navigation", () => ({
  redirect
}));

describe("GraphPage", () => {
  it("redirects old graph links back into the merged world page", async () => {
    await expect(
      GraphPage({
        params: { novelSlug: "glass-citadel" }
      })
    ).rejects.toThrow("NEXT_REDIRECT:/novels/glass-citadel/world");

    expect(redirect).toHaveBeenCalledWith("/novels/glass-citadel/world");
  });
});
