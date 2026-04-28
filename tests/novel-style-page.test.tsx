import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import NovelOverviewPage from "@/app/novels/[novelSlug]/page";
import { NovelStyleManager } from "@/components/novel-style-manager";
import { NovelCreationForm } from "@/components/novel-creation-form";
import { WorkspaceNav } from "@/components/workspace-nav";
import type { NovelStyleWorkspace } from "@/types/domain";

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
  usePathname: () => "/novels/glass-city/style",
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock("@/lib/repositories/novels", () => ({
  getNovelWorkspace: vi.fn(async () => ({
    novel: workspace.novel,
    voiceRules: [],
    chapters: [
      {
        id: "chapter-1",
        slug: "cold-rain",
        title: "冷雨开场",
        summary: "主角在雨里等一句没说完的话。",
        order: 1,
        status: "DRAFT",
        wordCount: 2200
      }
    ],
    entities: [],
    outlines: [],
    foreshadows: []
  }))
}));

const workspace: NovelStyleWorkspace = {
  novel: {
    id: "novel-1",
    slug: "glass-city",
    title: "玻璃城遗闻",
    premise: "她要从玻璃废墟里找回姐姐留下的第二份遗嘱。",
    genre: "都市奇想",
    status: "DRAFTING",
    updatedAt: "2026-04-27T00:00:00.000Z",
    chapterCount: 12,
    wordCount: 54000
  },
  profile: {
    id: "profile-1",
    styleSummary: "冷感、贴身、句子略短，解释晚于动作。",
    styleRules: ["动作先于解释", "少用结论句"],
    avoidRules: ["不要抒情堆叠"],
    dialogueRules: ["对白留白，不抢叙述节奏"],
    narrationRules: ["观察贴着主角感官走"],
    rhythmRules: ["短句切入，长句收束"],
    imageryRules: ["意象集中在玻璃、折射、冷光"],
    status: "READY",
    lastGeneratedAt: "2026-04-27T08:00:00.000Z"
  },
  samples: [
    {
      id: "sample-1",
      title: "冷雨开场",
      sourceType: "MANUAL_PASTE",
      content: "她没有立刻回头，只是把灯绳又绕了一圈，等雨声先落稳，再去听门外那句没说完的话。",
      note: "偏克制、停顿多",
      isActive: true,
      createdAt: "2026-04-27T01:00:00.000Z"
    }
  ]
};

describe("Novel style page contracts", () => {
  it("renders the style assets and sample sections with initial data", () => {
    const markup = renderToStaticMarkup(
      <NovelStyleManager novelSlug="glass-city" initialData={workspace} />
    );

    expect(markup).toContain("文风资产");
    expect(markup).toContain("当前生效规则");
    expect(markup).toContain("投喂素材");
    expect(markup).toContain("参考样文");
    expect(markup).toContain("冷感、贴身、句子略短，解释晚于动作。");
    expect(markup).toContain("动作先于解释");
    expect(markup).toContain("冷雨开场");
    expect(markup).toContain("偏克制、停顿多");
    expect(markup).toContain("保存规则");
    expect(markup).toContain("重新提炼");
    expect(markup).toContain("加入样文");
  });

  it("shows a 文风 entry in the workspace navigation", () => {
    const markup = renderToStaticMarkup(
      <WorkspaceNav novelSlug="glass-city" firstChapterSlug="chapter-1" />
    );

    expect(markup).toContain('href="/novels/glass-city/style"');
    expect(markup).toContain(">文风<");
  });

  it("renders the style asset card on the novel overview page", async () => {
    const markup = renderToStaticMarkup(
      await NovelOverviewPage({
        params: {
          novelSlug: "glass-city"
        }
      })
    );

    expect(markup).toContain("文风资产");
    expect(markup).toContain("管理参考样文、风格规则与去 AI 味偏好。");
    expect(markup).toContain('href="/novels/glass-city/style"');
    expect(markup).toContain("打开文风页");
  });

  it("renders the style reference section on the creation form", () => {
    const markup = renderToStaticMarkup(<NovelCreationForm />);

    expect(markup).toContain("文风参考");
    expect(markup).toContain("选填。现在先留空也可以，后续还能在书内继续投喂。");
    expect(markup).toContain("样文 1");
    expect(markup).toContain("样文内容");
  });
});
