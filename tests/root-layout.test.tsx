import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";

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

describe("RootLayout", () => {
  it("uses beginner-friendly global navigation labels and guidance", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>Body</div>
      </RootLayout>
    );

    expect(markup).toContain("开始页");
    expect(markup).toContain("我的作品");
    expect(markup).toContain("先看示例");
    expect(markup).toContain("新手先记这 3 句");
    expect(markup).toContain("先把书建起来，再慢慢补细节。");
    expect(markup).toContain("先保人设、逻辑和节奏，再谈修辞。");
    expect(markup).toContain("AI 只给建议稿，不会直接替你定稿。");
  });
});
