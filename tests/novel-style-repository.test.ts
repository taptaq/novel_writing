import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    novel: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    novelStyleProfile: {
      create: vi.fn()
    },
    novelStyleSample: {
      createMany: vi.fn()
    },
    storyEntity: {
      create: vi.fn()
    },
    entityRelation: {
      create: vi.fn()
    }
  };

  return {
    prisma: {
      $transaction: vi.fn(),
      novel: {
        findUnique: vi.fn()
      },
      novelStyleProfile: {
        upsert: vi.fn()
      },
      novelStyleSample: {
        create: vi.fn()
      }
    },
    tx
  };
});

vi.mock("@/lib/env", () => ({
  isDatabaseConfigured: true
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

import {
  addNovelStyleSample,
  createNovelWithSeedData,
  getChapterEditorData,
  getNovelStyleWorkspace,
  updateNovelStyleProfile
} from "@/lib/repositories/novels";

describe("novel style repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an empty style profile and initial samples during novel creation", async () => {
    const createdNovel = {
      id: "novel-1",
      slug: "glass-city",
      title: "玻璃城遗闻",
      premise: "档案修复师进入将塌的玻璃城，追查姐姐留下的第二份遗嘱。",
      summary: "档案修复师进入将塌的玻璃城，追查姐姐留下的第二份遗嘱。",
      genre: "奇幻 / 都市奇想",
      tone: "克制、冷感、观察细。",
      status: "PLANNING" as const,
      updatedAt: new Date("2026-04-27T00:00:00.000Z")
    };

    mocks.prisma.$transaction.mockImplementation(async (callback: typeof mocks.prisma.$transaction) =>
      callback(mocks.tx)
    );
    mocks.tx.novel.findUnique.mockResolvedValue(null);
    mocks.tx.novel.create.mockResolvedValue(createdNovel);

    const result = await createNovelWithSeedData({
      title: "玻璃城遗闻",
      category: "奇幻",
      subGenre: "都市奇想",
      targetAudience: "女频成长向",
      premise: "档案修复师进入将塌的玻璃城，追查姐姐留下的第二份遗嘱。",
      narrativeView: "第三人称有限视角",
      storyStructure: "三幕结构",
      plannedChapterCount: 24,
      targetWordsPerChapter: 3200,
      styleGoal: "克制、冷感、观察细。",
      styleSamples: [
        {
          title: "冷雨开场",
          content: "她没有立刻回头，只是把灯绳又绕了一圈，等雨声先落稳，再去听门外那句没说完的话。",
          note: "偏克制、停顿多"
        }
      ],
      characterSeeds: [],
      relationSeeds: []
    });

    expect(mocks.tx.novelStyleProfile.create).toHaveBeenCalledWith({
      data: {
        novelId: "novel-1",
        status: "EMPTY"
      }
    });
    expect(mocks.tx.novelStyleSample.createMany).toHaveBeenCalledWith({
      data: [
        {
          novelId: "novel-1",
          title: "冷雨开场",
          sourceType: "USER_SAMPLE",
          content: "她没有立刻回头，只是把灯绳又绕了一圈，等雨声先落稳，再去听门外那句没说完的话。",
          note: "偏克制、停顿多"
        }
      ]
    });
    expect(result.slug).toBe("glass-city");
  });

  it("stores relation description, remark, and note separately during novel creation", async () => {
    const createdNovel = {
      id: "novel-1",
      slug: "glass-city",
      title: "玻璃城遗闻",
      premise: "档案修复师进入将塌的玻璃城，追查姐姐留下的第二份遗嘱。",
      summary: "档案修复师进入将塌的玻璃城，追查姐姐留下的第二份遗嘱。",
      genre: "奇幻 / 都市奇想",
      tone: "克制、冷感、观察细。",
      status: "PLANNING" as const,
      updatedAt: new Date("2026-04-27T00:00:00.000Z")
    };

    mocks.prisma.$transaction.mockImplementation(async (callback: typeof mocks.prisma.$transaction) =>
      callback(mocks.tx)
    );
    mocks.tx.novel.findUnique.mockResolvedValue(null);
    mocks.tx.novel.create.mockResolvedValue(createdNovel);
    mocks.tx.storyEntity.create
      .mockResolvedValueOnce({ id: "entity-1" })
      .mockResolvedValueOnce({ id: "entity-2" });

    await createNovelWithSeedData({
      title: "玻璃城遗闻",
      category: "奇幻",
      subGenre: "都市奇想",
      targetAudience: "女频成长向",
      premise: "档案修复师进入将塌的玻璃城，追查姐姐留下的第二份遗嘱。",
      narrativeView: "第三人称有限视角",
      storyStructure: "三幕结构",
      plannedChapterCount: 24,
      targetWordsPerChapter: 3200,
      styleGoal: "克制、冷感、观察细。",
      styleSamples: [],
      characterSeeds: [
        {
          name: "祝衡",
          role: "档案修复师"
        },
        {
          name: "城档馆",
          role: "机构"
        }
      ],
      relationSeeds: [
        {
          sourceName: "祝衡",
          targetName: "城档馆",
          type: "OTHER",
          description: " 隶属关系 ",
          remark: " 主线绑定 ",
          note: " 第一阶段图谱备注 "
        }
      ]
    });

    expect(mocks.tx.entityRelation.create).toHaveBeenCalledWith({
      data: {
        sourceId: "entity-1",
        targetId: "entity-2",
        type: "OTHER",
        description: "隶属关系",
        remark: "主线绑定",
        note: "第一阶段图谱备注"
      }
    });
  });

  it("returns style workspace with normalized profile and active samples", async () => {
    mocks.prisma.novel.findUnique.mockResolvedValue({
      id: "novel-1",
      slug: "glass-city",
      title: "玻璃城遗闻",
      premise: "档案修复师进入将塌的玻璃城，追查姐姐留下的第二份遗嘱。",
      summary: null,
      genre: "奇幻 / 都市奇想",
      tone: "冷感",
      status: "DRAFTING",
      updatedAt: new Date("2026-04-27T00:00:00.000Z"),
      chapters: [{ wordCount: 1200 }, { wordCount: 800 }],
      styleProfile: {
        id: "profile-1",
        styleSummary: "冷感贴身视角",
        styleRules: ["动作先于解释", " ", "少用总结句"],
        avoidRules: ["不要抒情过满", ""],
        dialogueRules: [],
        narrationRules: ["镜头贴近身体"],
        rhythmRules: ["短段落"],
        imageryRules: null,
        status: "READY",
        lastGeneratedAt: new Date("2026-04-27T03:00:00.000Z")
      },
      styleSamples: [
        {
          id: "sample-1",
          title: "冷雨开场",
          sourceType: "USER_SAMPLE",
          content: "她没有立刻回头，只是把灯绳又绕了一圈，等雨声先落稳。",
          note: null,
          isActive: true,
          createdAt: new Date("2026-04-27T01:00:00.000Z")
        }
      ]
    });

    const workspace = await getNovelStyleWorkspace("glass-city");

    expect(mocks.prisma.novel.findUnique).toHaveBeenCalledWith({
      where: {
        slug: "glass-city"
      },
      include: {
        chapters: {
          select: {
            wordCount: true
          }
        },
        styleProfile: true,
        styleSamples: {
          where: {
            isActive: true
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });
    expect(workspace).toMatchObject({
      novel: {
        slug: "glass-city",
        chapterCount: 2,
        wordCount: 2000
      },
      profile: {
        id: "profile-1",
        styleSummary: "冷感贴身视角",
        styleRules: ["动作先于解释", "少用总结句"],
        avoidRules: ["不要抒情过满"],
        narrationRules: ["镜头贴近身体"],
        rhythmRules: ["短段落"],
        status: "READY"
      },
      samples: [
        {
          id: "sample-1",
          sourceType: "USER_SAMPLE",
          isActive: true
        }
      ]
    });
  });

  it("upserts a normalized style profile for a novel slug", async () => {
    mocks.prisma.novel.findUnique.mockResolvedValue({ id: "novel-1" });
    mocks.prisma.novelStyleProfile.upsert.mockResolvedValue({
      id: "profile-1",
      styleSummary: "冷静贴脸",
      styleRules: ["动作先于解释", "少用总结句"],
      avoidRules: ["不要金句收尾"],
      dialogueRules: ["对白留白"],
      narrationRules: [],
      rhythmRules: ["多停顿"],
      imageryRules: [],
      status: "READY",
      lastGeneratedAt: new Date("2026-04-27T05:00:00.000Z")
    });

    const profile = await updateNovelStyleProfile("glass-city", {
      styleSummary: "冷静贴脸",
      styleRules: ["动作先于解释", " ", "少用总结句"],
      avoidRules: ["不要金句收尾", ""],
      dialogueRules: ["对白留白"],
      rhythmRules: ["多停顿"],
      status: "READY",
      lastGeneratedAt: "2026-04-27T05:00:00.000Z"
    });

    const persistenceInput = {
      styleSummary: "冷静贴脸",
      styleRules: ["动作先于解释", "少用总结句"],
      avoidRules: ["不要金句收尾"],
      dialogueRules: ["对白留白"],
      narrationRules: [],
      rhythmRules: ["多停顿"],
      imageryRules: [],
      status: "READY",
      lastGeneratedAt: new Date("2026-04-27T05:00:00.000Z")
    };

    expect(mocks.prisma.novelStyleProfile.upsert).toHaveBeenCalledWith({
      where: {
        novelId: "novel-1"
      },
      create: {
        novelId: "novel-1",
        ...persistenceInput
      },
      update: persistenceInput
    });
    expect(profile).toMatchObject({
      id: "profile-1",
      styleSummary: "冷静贴脸",
      styleRules: ["动作先于解释", "少用总结句"],
      avoidRules: ["不要金句收尾"],
      status: "READY"
    });
  });

  it("creates manual style samples and exposes optional style profile in chapter editor data", async () => {
    mocks.prisma.novel.findUnique
      .mockResolvedValueOnce({ id: "novel-1" })
      .mockResolvedValueOnce({
        id: "novel-1",
        slug: "glass-city",
        title: "玻璃城遗闻",
        premise: null,
        summary: null,
        genre: null,
        tone: null,
        status: "DRAFTING",
        updatedAt: new Date("2026-04-27T00:00:00.000Z"),
        voiceRules: [],
        styleProfile: null,
        chapters: [
          {
            id: "chapter-1",
            slug: "chapter-1",
            title: "第一章",
            summary: null,
            sceneGoal: null,
            order: 1,
            status: "DRAFT",
            wordCount: 1200,
            plainText: "她没有立刻回头，只是把灯绳又绕了一圈。"
          }
        ],
        entities: [],
        outlines: [],
        foreshadows: []
      });
    mocks.prisma.novelStyleSample.create.mockResolvedValue({
      id: "sample-2",
      title: "夜路",
      sourceType: "MANUAL_PASTE",
      content: "她在走廊尽头停了一下，像是先把脚步声听完，才决定要不要继续往前。",
      note: "步调慢",
      isActive: true,
      createdAt: new Date("2026-04-27T06:00:00.000Z")
    });

    const sample = await addNovelStyleSample("glass-city", {
      title: " 夜路 ",
      content: "她在走廊尽头停了一下，像是先把脚步声听完，才决定要不要继续往前。",
      note: " 步调慢 "
    });
    const chapterData = await getChapterEditorData("glass-city", "chapter-1");

    expect(mocks.prisma.novelStyleSample.create).toHaveBeenCalledWith({
      data: {
        novelId: "novel-1",
        title: "夜路",
        sourceType: "MANUAL_PASTE",
        content: "她在走廊尽头停了一下，像是先把脚步声听完，才决定要不要继续往前。",
        note: "步调慢"
      }
    });
    expect(sample).toMatchObject({
      id: "sample-2",
      title: "夜路",
      sourceType: "MANUAL_PASTE",
      note: "步调慢"
    });
    expect(chapterData?.styleProfile).toBeUndefined();
  });
});
