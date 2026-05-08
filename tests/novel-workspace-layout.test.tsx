import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import NovelWorkspaceLayout from "@/app/novels/[novelSlug]/layout";

globalThis.React = React;

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  })
}));

vi.mock("@/lib/repositories/novels", async () => {
  const actual = await vi.importActual<typeof import("@/lib/repositories/novels")>(
    "@/lib/repositories/novels"
  );

  return {
    ...actual,
    getNovelWorkspace: vi.fn(async () => {
      throw new actual.NovelWorkspaceRepositoryError(
        "WORKSPACE_READ_FAILED",
        "glass-city",
        new Error('column "voiceRules" does not exist')
      );
    })
  };
});

vi.mock("@/components/workspace-nav", () => ({
  WorkspaceNav: () => <div>WorkspaceNav</div>
}));

describe("NovelWorkspaceLayout", () => {
  it("shows a visible workspace loading failure instead of falling through to not-found", async () => {
    const markup = renderToStaticMarkup(
      await NovelWorkspaceLayout({
        params: { novelSlug: "glass-city" },
        children: <div>Body</div>
      })
    );

    expect(markup).toContain("工作区暂时没读出来");
    expect(markup).toContain("这本书能在列表里看到，但进入工作区时没拿到完整数据。");
    expect(markup).toContain("先回作品列表");
    expect(markup).toContain("重新新建一本");
    expect(markup).not.toContain("这里还没有内容");
  });
});
