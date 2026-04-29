import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import NotFound from "@/app/not-found";

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

describe("NotFound page", () => {
  it("gives a beginner-friendly way back into the product", () => {
    const markup = renderToStaticMarkup(<NotFound />);

    expect(markup).toContain("这里还没有准备好");
    expect(markup).toContain("你可以先回到作品列表，或者先去示例里看看完整流程。");
    expect(markup).toContain("回作品列表");
    expect(markup).toContain("先看示例");
    expect(markup).toContain('href="/novels"');
    expect(markup).toContain('href="/demo/tide-and-embers"');
  });
});
