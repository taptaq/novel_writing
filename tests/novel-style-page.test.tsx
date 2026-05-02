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
    expect(markup).toContain("这本书的文风规则");
    expect(markup).toContain("贴你想要的文字风格");
    expect(markup).toContain("已收录样文");
    expect(markup).toContain("冷感、贴身、句子略短，解释晚于动作。");
    expect(markup).toContain("动作先于解释");
    expect(markup).toContain("冷雨开场");
    expect(markup).toContain("偏克制、停顿多");
    expect(markup).toContain("保存规则");
    expect(markup).toContain("重新整理");
    expect(markup).toContain("加入样文");
  });

  it("shows a trimmed workspace navigation focused on overview, writing, settings, and more", () => {
    const markup = renderToStaticMarkup(
      <WorkspaceNav novelSlug="glass-city" firstChapterSlug="chapter-1" />
    );

    expect(markup).toContain('href="/novels/glass-city"');
    expect(markup).toContain('href="/novels/glass-city/chapters/chapter-1"');
    expect(markup).toContain('href="/novels/glass-city/world"');
    expect(markup).toContain('href="/novels/glass-city/style"');
    expect(markup).toContain('title="直接开始写这一章"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain(">总览<");
    expect(markup).toContain(">写作<");
    expect(markup).toContain(">设定<");
    expect(markup).toContain(">更多<");
    expect(markup).not.toContain(">图谱<");
    expect(markup).not.toContain(">文风<");
    expect(markup).not.toContain(">AI 策略<");
  });

  it("renders three primary next-action cards on the novel overview page", async () => {
    const markup = renderToStaticMarkup(
      await NovelOverviewPage({
        params: {
          novelSlug: "glass-city"
        }
      })
    );

    expect(markup).toContain("继续写作");
    expect(markup).toContain("补人物和关系");
    expect(markup).toContain("看结构和伏笔");
    expect(markup).toContain("从最近一章接着写。");
    expect(markup).toContain("先把主角、对手和关系补上。");
    expect(markup).toContain("不知道怎么写，就先顺一下。");
    expect(markup).toContain('href="/novels/glass-city/chapters/cold-rain"');
    expect(markup).toContain('href="/novels/glass-city/world"');
    expect(markup).toContain('href="/novels/glass-city/outline"');
    expect(markup).toContain("这本书现在更该盯什么");
    expect(markup).toContain("大纲建议拆到章节级，避免中段松散。");
    expect(markup).not.toContain("文风资产");
    expect(markup).not.toContain("篇幅规划");
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
    expect(markup).toContain("先做这一件就行。");
    expect(markup.indexOf("你现在先做这一件就够了")).toBeLessThan(markup.indexOf("继续写作"));
  });

  it("renders the style reference section on the creation form", () => {
    const markup = renderToStaticMarkup(<NovelCreationForm />);

    expect(markup).toContain("第 1 步");
    expect(markup).toContain("导入你的想法");
    expect(markup).toContain("快速新建");
    expect(markup).toContain("AI 解析设定创建");
    expect(markup).toContain("现在是快速新建，往下填就行。");
    expect(markup).toContain("先填最少的，后面再补。");
    expect(markup).toContain("第 2 步 / 先填这些");
    expect(markup).toContain("一句话故事核心");
    expect(markup).toContain("第 3 步 / 想补再补");
    expect(markup).toContain("我想继续补细节");
    expect(markup).not.toContain("支持粘贴文本或上传设定文件");
    expect(markup).not.toContain(">开始解析<");
  });

  it("renders the ai-parse path when the creation form starts in ai mode", () => {
    const markup = renderToStaticMarkup(<NovelCreationForm initialCreationMode="ai_parse" />);

    expect(markup).toContain("AI 先整理设定");
    expect(markup).toContain("开始解析");
    expect(markup).toContain("应用全部到表单");
    expect(markup).toContain("只填空白项");
    expect(markup).toContain("人物 1");
    expect(markup).not.toContain("人物 2");
    expect(markup).toContain("新增人物");
    expect(markup).toContain("文风参考");
    expect(markup).toContain("这里是给 AI 学你想要的感觉。现在不填，后面也能继续补。");
    expect(markup).toContain("贴设定或传文件，先出一版草稿。");
    expect(markup).toContain("样文 1");
    expect(markup).toContain("样文内容");
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>开始解析<\/button>/);
    expect(markup).toContain("创建这本书");
  });

  it("renders a detailed parse preview when parsed setup data exists", () => {
    const markup = renderToStaticMarkup(
      <NovelCreationForm
        initialCreationMode="ai_parse"
        initialParsedSetupDraft={{
          title: "潮汐灰烬",
          category: "悬疑",
          subGenre: "港口谜案",
          targetAudience: "成年读者",
          premise: "一次停摆的潮汐钟，让修钟学徒卷进旧港失踪案。",
          narrativeView: "第三人称限知",
          storyStructure: "三幕式",
          lengthCategory: "LONG",
          plannedChapterCount: 18,
          targetWordsPerChapter: 3000,
          worldSeed: "盐雾旧港与钟楼区。",
          styleGoal: "克制、冷感、细节推进。",
          styleSamples: [],
          factionSeeds: [
            {
              name: "城档馆",
              summary: "旧港档案机构"
            }
          ],
          locationSeeds: [
            {
              name: "北钟塔",
              summary: "潮汐钟核心区"
            }
          ],
          characterSeeds: [
            {
              name: "沈砚",
              role: "修钟学徒",
              summary: "擅长修钟，也擅长从细节里找破口。",
              factionName: "旧港钟楼",
              locationName: "下城钟房"
            },
            {
              name: "周棠",
              role: "港务署记录员",
              summary: "手里握着案卷里缺掉的那一页。",
              factionName: "港务署",
              locationName: "旧港档案室"
            }
          ],
          relationSeeds: [
            {
              sourceName: "沈砚",
              targetName: "城档馆",
              type: "MEMBER_OF",
              description: "长期在馆内工作"
            }
          ],
          guessedFields: ["目标受众", "预计总章数"],
          missingFields: ["文风参考样文"],
          confidenceNotes: ["篇幅是按设定复杂度推测的"]
        }}
      />
    );

    expect(markup).toContain("核心信息预览");
    expect(markup).toContain("规划信息预览");
    expect(markup).toContain("设定信息预览");
    expect(markup).toContain("人物解析");
    expect(markup).toContain("图谱预览");
    expect(markup).toContain("解析提示");
    expect(markup).toContain("潮汐灰烬");
    expect(markup).toContain("港口谜案");
    expect(markup).toContain("18 章");
    expect(markup).toContain("约 3000 字");
    expect(markup).toContain("城档馆");
    expect(markup).toContain("北钟塔");
    expect(markup).toContain("已识别关系");
    expect(markup).toContain("<li>沈砚 属于 城档馆</li>");
    expect(markup).toContain("沈砚 属于 城档馆");
    expect(markup).not.toContain("MEMBER_OF");
    expect(markup).toContain("沈砚");
    expect(markup).toContain("周棠");
    expect(markup).toContain("AI 推测补全：目标受众 / 预计总章数");
    expect(markup).toContain("还缺信息：文风参考样文");
    expect(markup).toContain("说明：篇幅是按设定复杂度推测的");
    expect(markup).not.toContain("Guessed:");
    expect(markup).not.toContain("Missing:");
    expect(markup).not.toContain("Notes:");
    expect(markup).toContain("应用全部不会覆盖文风参考");
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
