import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import NewNovelPage from "@/app/novels/new/page";

globalThis.React = React;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

describe("NewNovelPage", () => {
  it("renders the creation page shell around the real creation form", async () => {
    const markup = renderToStaticMarkup(await NewNovelPage());

    expect(markup).toContain("新建书籍");
    expect(markup).toContain("先把项目建起来");
    expect(markup).toContain("填完核心信息，再补几个人物种子，就能直接进入工作区。");
    expect(markup).toContain("创建作品");
    expect(markup).toContain("开始解析");
    expect(markup).toContain("应用全部到表单");
    expect(markup).toContain("只填空白项");
  });
});
