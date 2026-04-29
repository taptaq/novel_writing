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

    expect(markup).toContain("第 2 步");
    expect(markup).toContain("先把这本书建起来");
    expect(markup).toContain("第 1 步");
    expect(markup).toContain("导入你的想法");
    expect(markup).toContain("先把书建起来，后面再慢慢补细节。");
    expect(markup).toContain("先填核心信息，就能进入作品开始写。");
    expect(markup).toContain("快速新建");
    expect(markup).toContain("我想继续补细节");
    expect(markup).toContain("创建这本书");
    expect(markup).not.toContain("支持粘贴文本或上传设定文件");
    expect(markup).not.toContain(">开始解析<");
  });
});
