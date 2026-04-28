import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import NewNovelPage from "@/app/novels/new/page";

globalThis.React = React;

vi.mock("@/components/novel-creation-form", () => ({
  NovelCreationForm: () => (
    <form>
      <section>基础信息</section>
      <section>扩展策划</section>
      <section>人物种子</section>
      <button type="submit">创建作品</button>
    </form>
  )
}));

describe("NewNovelPage", () => {
  it("renders the three-section creation page shell", async () => {
    const markup = renderToStaticMarkup(await NewNovelPage());

    expect(markup).toContain("新建书籍");
    expect(markup).toContain("先把项目建起来");
    expect(markup).toContain("基础信息");
    expect(markup).toContain("扩展策划");
    expect(markup).toContain("人物种子");
    expect(markup).toContain("创建作品");
  });
});
