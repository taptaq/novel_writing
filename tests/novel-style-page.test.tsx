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

    expect(markup).toContain("让 AI 更像这本书");
    expect(markup).toContain("这本书现在的语气规则");
    expect(markup).toContain("上传你认可的文字");
    expect(markup).toContain("已收录样文");
    expect(markup).toContain("冷感、贴身、句子略短，解释晚于动作。");
    expect(markup).toContain("动作先于解释");
    expect(markup).toContain("冷雨开场");
    expect(markup).toContain("偏克制、停顿多");
    expect(markup).toContain("保存这些规则");
    expect(markup).toContain("重新整理规则");
    expect(markup).toContain("加入这段样文");
  });

  it("shows a 文风 entry in the workspace navigation", () => {
    const markup = renderToStaticMarkup(
      <WorkspaceNav novelSlug="glass-city" firstChapterSlug="chapter-1" />
    );

    expect(markup).toContain('href="/novels/glass-city/style"');
    expect(markup).toContain('title="让 AI 更贴近这本书的感觉"');
    expect(markup).toContain('title="直接开始写这一章"');
    expect(markup).toContain('aria-current="page"');
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
    expect(markup).toContain("想让 AI 更像这本书的语气，就来这里补样文和规则。");
    expect(markup).toContain('href="/novels/glass-city/style"');
    expect(markup).toContain("打开文风页");
    expect(markup).toContain("还没补关键人物，先写主角、对手和关系就够了。");
    expect(markup).toContain("还没顺后续走向，先列开头几章就够了。");
    expect(markup).toContain("还没记伏笔，后面想到关键埋点再补也行。");
  });

  it("renders the recommended next-step hero card at the top of the novel overview page", async () => {
    const markup = renderToStaticMarkup(
      await NovelOverviewPage({
        params: {
          novelSlug: "glass-city"
        }
      })
    );

    expect(markup).toContain("你现在先做这一件就够了");
    expect(markup).toContain("先补关键人物");
    expect(markup).toContain("先把主角、对手和关键关系补齐，后面写章节才不容易空转。");
    expect(markup).toContain('href="/novels/glass-city/world"');
    expect(markup).toContain("去补人物");
    expect(markup).toContain("不用一次把所有模块都做完，先推进当前最关键的一步。");
    expect(markup.indexOf("你现在先做这一件就够了")).toBeLessThan(markup.indexOf("篇幅规划"));
  });

  it("renders the style reference section on the creation form", () => {
    const markup = renderToStaticMarkup(<NovelCreationForm />);

    expect(markup).toContain("第 1 步");
    expect(markup).toContain("导入你的想法");
    expect(markup).toContain("快速新建");
    expect(markup).toContain("AI 解析设定创建");
    expect(markup).toContain("你现在走的是快速新建，直接往下填就可以。");
    expect(markup).toContain("先填最关键的信息就能开始写，其他都可以后面补。");
    expect(markup).toContain("第 2 步 / 先填这些就够了");
    expect(markup).toContain("一句话故事核心");
    expect(markup).toContain("第 3 步 / 这些现在不填也可以");
    expect(markup).toContain("我想继续补细节");
    expect(markup).not.toContain("支持粘贴文本或上传设定文件");
    expect(markup).not.toContain(">开始解析<");
  });

  it("renders the ai-parse path when the creation form starts in ai mode", () => {
    const markup = renderToStaticMarkup(<NovelCreationForm initialCreationMode="ai_parse" />);

    expect(markup).toContain("AI 帮你先读设定");
    expect(markup).toContain("开始解析");
    expect(markup).toContain("应用全部到表单");
    expect(markup).toContain("只填空白项");
    expect(markup).toContain("人物 1");
    expect(markup).not.toContain("人物 2");
    expect(markup).toContain("新增人物");
    expect(markup).toContain("文风参考");
    expect(markup).toContain("这里是给 AI 学你想要的感觉。现在不填，后面也能继续补。");
    expect(markup).toContain("把设定贴进来或传文件，先出一版回填草稿，再由你决定用哪些。");
    expect(markup).toContain("样文 1");
    expect(markup).toContain("样文内容");
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>开始解析<\/button>/);
    expect(markup).toContain("创建这本书");
  });

  it("renders length category controls and default planning hints on the creation form", () => {
    const markup = renderToStaticMarkup(<NovelCreationForm initialCreationMode="ai_parse" />);

    expect(markup).toContain("篇幅类型");
    expect(markup).toContain("短篇");
    expect(markup).toContain("中篇");
    expect(markup).toContain("长篇");
    expect(markup).toContain("篇幅建议");
    expect(markup).toContain("功能侧重");
  });
});
