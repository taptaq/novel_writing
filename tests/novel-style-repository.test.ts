import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const mocks = vi.hoisted(() => {
  const tx = {
    novel: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    chapter: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    chapterVersion: {
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
      aiSuggestion: {
        create: vi.fn(),
        findMany: vi.fn()
      },
      chapter: {
        findFirst: vi.fn()
      },
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
  createChapter,
  createNovelWithSeedData,
  getChapterEditorData,
  getNovelStyleWorkspace,
  saveChapterAuditRecord,
  saveChapterDraft,
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

  it("returns chapter navigation items and version summaries for the editor", async () => {
    mocks.prisma.novel.findUnique.mockResolvedValue({
      id: "novel-1",
      slug: "glass-city",
      title: "玻璃城遗闻",
      premise: "档案修复师进入将塌的玻璃城。",
      summary: null,
      genre: "都市奇想",
      tone: "冷感",
      lengthCategory: "MEDIUM",
      status: "DRAFTING",
      updatedAt: new Date("2026-04-29T00:00:00.000Z"),
      voiceRules: [],
      styleProfile: null,
      chapters: [
        {
          id: "chapter-1",
          slug: "cold-rain",
          title: "第 1 章",
          summary: "冷雨开场",
          sceneGoal: "让主角意识到危险",
          plainText: "她没有立刻回头。",
          order: 1,
          status: "DRAFT",
          wordCount: 1200,
          updatedAt: new Date("2026-04-29T08:30:00.000Z"),
          versions: [
            {
              id: "version-2",
              source: "manual",
              note: null,
              plainText: "她没有立刻回头。",
              createdAt: new Date("2026-04-29T08:00:00.000Z")
            },
            {
              id: "version-1",
              source: "autosave",
              note: null,
              plainText: "她站在门口。",
              createdAt: new Date("2026-04-29T07:00:00.000Z")
            }
          ]
        },
        {
          id: "chapter-2",
          slug: "signal",
          title: "第 2 章",
          summary: "新信号",
          sceneGoal: null,
          plainText: "第二章内容。",
          order: 2,
          status: "DRAFT",
          wordCount: 980,
          updatedAt: new Date("2026-04-29T08:45:00.000Z"),
          versions: []
        }
      ],
      entities: [],
      outlines: [],
      foreshadows: []
    });
    mocks.prisma.aiSuggestion.findMany.mockResolvedValue([
      {
        id: "audit-2",
        suggestedText: "前半段张力够，但后半段解释偏多。",
        rationale: {
          summary: "这一章整体顺，但结尾解释多了一点。",
          primary: {
            title: "本章总体判断",
            text: "前半段张力够，但后半段解释偏多。"
          },
          warnings: ["老齐这段话说得太满。"],
          nextContext: ["把老齐的解释压短。"],
          meta: {
            resolvedProvider: "dmx",
            resolvedModel: "mimo-v2.5-free",
            usedFallback: false
          }
        },
        createdAt: new Date("2026-04-29T09:10:00.000Z")
      }
    ]);

    const result = await getChapterEditorData("glass-city", "cold-rain");

    expect(mocks.prisma.novel.findUnique).toHaveBeenCalledWith({
      where: {
        slug: "glass-city"
      },
      include: {
        chapters: {
          orderBy: {
            order: "asc"
          },
          include: {
            versions: {
              orderBy: {
                createdAt: "desc"
              },
              take: 10
            }
          }
        },
        entities: true,
        styleProfile: true,
        outlines: {
          include: {
            chapter: {
              select: {
                slug: true
              }
            }
          },
          orderBy: [
            {
              depth: "asc"
            },
            {
              order: "asc"
            }
          ]
        },
        foreshadows: {
          include: {
            firstMentionChapter: {
              select: {
                slug: true
              }
            },
            payoffChapter: {
              select: {
                slug: true
              }
            }
          }
        }
      }
    });
    expect(result).toMatchObject({
      auditHistory: [
        expect.objectContaining({
          id: "audit-2",
          summary: "这一章整体顺，但结尾解释多了一点。",
          primaryTitle: "本章总体判断",
          primaryText: "前半段张力够，但后半段解释偏多。",
          warnings: ["老齐这段话说得太满。"],
          nextContext: ["把老齐的解释压短。"],
          resolvedModel: "mimo-v2.5-free"
        })
      ],
      chapters: [
        expect.objectContaining({
          slug: "cold-rain",
          title: "第 1 章",
          wordCount: 1200
        }),
        expect.objectContaining({
          slug: "signal",
          title: "第 2 章",
          wordCount: 980
        })
      ],
      versions: [
        expect.objectContaining({
          id: "version-2",
          source: "manual",
          wordCount: expect.any(Number)
        }),
        expect.objectContaining({
          id: "version-1",
          source: "autosave",
          wordCount: expect.any(Number)
        })
      ]
    });
    expect(mocks.prisma.aiSuggestion.findMany).toHaveBeenCalledWith({
      where: {
        novelId: "novel-1",
        chapterId: "chapter-1",
        type: "AUDIT"
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });
  });

  it("returns null instead of demo chapter data when the database novel is missing, even for the demo slug", async () => {
    mocks.prisma.novel.findUnique.mockResolvedValue(null);

    const result = await getChapterEditorData("tide-and-embers", "unopened-letter");

    expect(result).toBeNull();
  });

  it("returns null instead of demo chapter data when the database novel exists but the requested demo-slug chapter is missing", async () => {
    mocks.prisma.novel.findUnique.mockResolvedValue({
      id: "novel-1",
      slug: "tide-and-embers",
      title: "数据库里的潮汐灰烬",
      premise: null,
      summary: null,
      genre: null,
      tone: null,
      lengthCategory: "MEDIUM",
      status: "DRAFTING",
      updatedAt: new Date("2026-04-29T00:00:00.000Z"),
      voiceRules: [],
      styleProfile: null,
      chapters: [
        {
          id: "chapter-1",
          slug: "cold-rain",
          title: "第 1 章",
          summary: null,
          sceneGoal: null,
          plainText: "她没有立刻回头。",
          order: 1,
          status: "DRAFT",
          wordCount: 1200,
          updatedAt: new Date("2026-04-29T08:30:00.000Z"),
          versions: []
        }
      ],
      entities: [],
      outlines: [],
      foreshadows: []
    });

    const result = await getChapterEditorData("tide-and-embers", "unopened-letter");

    expect(result).toBeNull();
  });

  it("saves chapter drafts with word counts and chapter versions", async () => {
    mocks.prisma.$transaction.mockImplementation(async (callback: typeof mocks.prisma.$transaction) =>
      callback(mocks.tx)
    );
    mocks.tx.novel.findUnique.mockResolvedValue({
      id: "novel-1"
    });
    mocks.tx.chapter.updateMany.mockResolvedValue({
      count: 1
    });
    mocks.tx.chapter.findFirst.mockResolvedValueOnce({
      id: "chapter-1",
      slug: "cold-rain",
      updatedAt: new Date("2026-04-29T09:58:00.000Z")
    });
    mocks.tx.chapter.findFirst.mockResolvedValueOnce({
      title: "雨夜回声",
      slug: "cold-rain",
      wordCount: 17,
      updatedAt: new Date("2026-04-29T10:00:00.000Z")
    });
    mocks.tx.chapterVersion.create.mockResolvedValue({
      id: "version-3",
      source: "manual",
      createdAt: new Date("2026-04-29T10:00:00.000Z"),
      plainText: "  她没有立刻回头。\n\n只是把灯绳又绕了一圈。  "
    });

    const result = await saveChapterDraft("glass-city", "cold-rain", {
      title: "  雨夜回声  ",
      plainText: "  她没有立刻回头。\n\n只是把灯绳又绕了一圈。  ",
      source: "manual",
      note: "  章节备注  "
    });

    expect(mocks.tx.chapter.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        slug: "cold-rain",
        novelId: "novel-1"
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true
      }
    });
    expect(mocks.tx.chapter.updateMany).toHaveBeenCalledWith({
      where: {
        id: "chapter-1"
      },
      data: {
        title: "雨夜回声",
        plainText: "  她没有立刻回头。\n\n只是把灯绳又绕了一圈。  ",
        content: [
          {
            id: "block-1",
            type: "paragraph",
            text: "她没有立刻回头。"
          },
          {
            id: "block-2",
            type: "paragraph",
            text: "只是把灯绳又绕了一圈。"
          }
        ],
        wordCount: 17
      }
    });
    expect(mocks.tx.chapter.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        id: "chapter-1"
      },
      select: {
        title: true,
        slug: true,
        wordCount: true,
        updatedAt: true
      }
    });
    expect(mocks.tx.chapterVersion.create).toHaveBeenCalledWith({
      data: {
        chapterId: "chapter-1",
        source: "manual",
        note: "章节备注",
        content: [
          {
            id: "block-1",
            type: "paragraph",
            text: "她没有立刻回头。"
          },
          {
            id: "block-2",
            type: "paragraph",
            text: "只是把灯绳又绕了一圈。"
          }
        ],
        plainText: "  她没有立刻回头。\n\n只是把灯绳又绕了一圈。  "
      },
      select: {
        id: true,
        source: true,
        createdAt: true
      }
    });
    expect(result).toEqual({
      chapter: {
        title: "雨夜回声",
        slug: "cold-rain",
        wordCount: 17,
        updatedAt: "2026-04-29T10:00:00.000Z"
      },
      version: {
        id: "version-3",
        source: "manual",
        createdAt: "2026-04-29T10:00:00.000Z",
        wordCount: 17
      }
    });
  });

  it("does not create a chapter version during autosave", async () => {
    mocks.prisma.$transaction.mockImplementation(async (callback: typeof mocks.prisma.$transaction) =>
      callback(mocks.tx)
    );
    mocks.tx.novel.findUnique.mockResolvedValue({
      id: "novel-1"
    });
    mocks.tx.chapter.updateMany.mockResolvedValue({
      count: 1
    });
    mocks.tx.chapter.findFirst.mockResolvedValueOnce({
      id: "chapter-1",
      slug: "cold-rain",
      updatedAt: new Date("2026-04-29T10:00:00.000Z")
    });
    mocks.tx.chapter.findFirst.mockResolvedValueOnce({
      title: "第三声钟响前",
      slug: "cold-rain",
      wordCount: 9,
      updatedAt: new Date("2026-04-29T10:05:00.000Z")
    });

    const result = await saveChapterDraft("glass-city", "cold-rain", {
      title: "第三声钟响前",
      plainText: "  她没有立刻回头。  ",
      source: "autosave"
    });

    expect(mocks.tx.chapterVersion.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      chapter: {
        title: "第三声钟响前",
        slug: "cold-rain",
        wordCount: 9,
        updatedAt: "2026-04-29T10:05:00.000Z"
      },
      version: null
    });
    expect(mocks.tx.chapter.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        id: "chapter-1"
      },
      select: {
        title: true,
        slug: true,
        wordCount: true,
        updatedAt: true
      }
    });
  });

  it("saves chapter audit records into ai suggestions", async () => {
    mocks.prisma.chapter.findFirst.mockResolvedValue({
      id: "chapter-1",
      novelId: "novel-1"
    });
    mocks.prisma.aiSuggestion.create.mockResolvedValue({
      id: "audit-3",
      suggestedText: "整体没跑偏，但结尾解释偏多。",
      rationale: {
        summary: "整体没跑偏，但结尾解释偏多。",
        primary: {
          title: "本章总体判断",
          text: "整体没跑偏，但结尾解释偏多。"
        },
        warnings: ["结尾那段解释收一收。"],
        nextContext: ["把最后一段拆成动作和停顿。"],
        meta: {
          resolvedProvider: "dmx",
          resolvedModel: "mimo-v2.5-free",
          usedFallback: false
        }
      },
      createdAt: new Date("2026-04-29T10:20:00.000Z")
    });

    const result = await saveChapterAuditRecord("glass-city", "cold-rain", {
      instruction: "检查这一章前后是否连贯",
      sourceText: "她没有立刻回头。",
      result: {
        mode: "audit",
        summary: "整体没跑偏，但结尾解释偏多。",
        primary: {
          title: "本章总体判断",
          text: "整体没跑偏，但结尾解释偏多。",
          why: "会削弱悬念。"
        },
        alternatives: [],
        warnings: ["结尾那段解释收一收。"],
        nextContext: ["把最后一段拆成动作和停顿。"],
        meta: {
          requestedModel: "mimo",
          resolvedProvider: "dmx",
          resolvedModel: "mimo-v2.5-free",
          usedFallback: false
        }
      }
    });

    expect(mocks.prisma.chapter.findFirst).toHaveBeenCalledWith({
      where: {
        slug: "cold-rain",
        novel: {
          slug: "glass-city"
        }
      },
      select: {
        id: true,
        novelId: true
      }
    });
    expect(mocks.prisma.aiSuggestion.create).toHaveBeenCalledWith({
      data: {
        novelId: "novel-1",
        chapterId: "chapter-1",
        type: "AUDIT",
        instruction: "检查这一章前后是否连贯",
        sourceText: "她没有立刻回头。",
        suggestedText: "整体没跑偏，但结尾解释偏多。",
        rationale: {
          summary: "整体没跑偏，但结尾解释偏多。",
          primary: {
            title: "本章总体判断",
            text: "整体没跑偏，但结尾解释偏多。",
            why: "会削弱悬念。"
          },
          warnings: ["结尾那段解释收一收。"],
          nextContext: ["把最后一段拆成动作和停顿。"],
          alternatives: [],
          meta: {
            requestedModel: "mimo",
            resolvedProvider: "dmx",
            resolvedModel: "mimo-v2.5-free",
            usedFallback: false
          }
        }
      }
    });
    expect(result).toMatchObject({
      id: "audit-3",
      summary: "整体没跑偏，但结尾解释偏多。",
      primaryTitle: "本章总体判断",
      primaryText: "整体没跑偏，但结尾解释偏多。"
    });
  });

  it("rejects stale draft saves when expectedUpdatedAt no longer matches", async () => {
    mocks.prisma.$transaction.mockImplementation(async (callback: typeof mocks.prisma.$transaction) =>
      callback(mocks.tx)
    );
    mocks.tx.novel.findUnique.mockResolvedValue({
      id: "novel-1"
    });
    mocks.tx.chapter.findFirst.mockResolvedValueOnce({
      id: "chapter-1",
      slug: "cold-rain",
      updatedAt: new Date("2026-04-29T10:03:00.000Z")
    });
    mocks.tx.chapter.updateMany.mockResolvedValue({
      count: 0
    });

    await expect(
      saveChapterDraft("glass-city", "cold-rain", {
        title: "第三声钟响前",
        plainText: "她没有立刻回头。",
        source: "autosave",
        expectedUpdatedAt: "2026-04-29T10:00:00.000Z"
      })
    ).rejects.toMatchObject({
      code: "STALE_CHAPTER_DRAFT"
    });

    expect(mocks.tx.chapter.updateMany).toHaveBeenCalledWith({
      where: {
        id: "chapter-1",
        updatedAt: new Date("2026-04-29T10:00:00.000Z")
      },
      data: {
        title: "第三声钟响前",
        plainText: "她没有立刻回头。",
        content: [
          {
            id: "block-1",
            type: "paragraph",
            text: "她没有立刻回头。"
          }
        ],
        wordCount: 7
      }
    });
    expect(mocks.tx.chapter.update).not.toHaveBeenCalled();
    expect(mocks.tx.chapterVersion.create).not.toHaveBeenCalled();
  });

  it("creates the next chapter with incremented order and empty persisted content", async () => {
    mocks.prisma.$transaction.mockImplementation(async (callback: typeof mocks.prisma.$transaction) =>
      callback(mocks.tx)
    );
    mocks.tx.novel.findUnique.mockResolvedValue({
      id: "novel-1"
    });
    mocks.tx.chapter.findFirst
      .mockResolvedValueOnce({
        order: 2
      })
      .mockResolvedValueOnce(null);
    mocks.tx.chapter.create.mockResolvedValue({
      slug: "chapter-3",
      title: "第 3 章",
      order: 3
    });

    const result = await createChapter("glass-city");

    expect(mocks.tx.chapter.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        novelId: "novel-1"
      },
      orderBy: {
        order: "desc"
      },
      select: {
        order: true
      }
    });
    expect(mocks.tx.chapter.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        novelId: "novel-1",
        slug: "chapter-3"
      },
      select: {
        id: true
      }
    });
    expect(mocks.tx.chapter.create).toHaveBeenCalledWith({
      data: {
        novelId: "novel-1",
        slug: "chapter-3",
        title: "第 3 章",
        order: 3,
        content: [],
        plainText: "",
        wordCount: 0
      },
      select: {
        slug: true,
        title: true,
        order: true
      }
    });
    expect(result).toEqual({
      chapter: {
        slug: "chapter-3",
        title: "第 3 章",
        order: 3
      }
    });
  });

  it("retries chapter creation after a unique constraint conflict and then succeeds", async () => {
    mocks.prisma.$transaction.mockImplementation(async (callback: typeof mocks.prisma.$transaction) =>
      callback(mocks.tx)
    );
    mocks.tx.novel.findUnique.mockResolvedValue({
      id: "novel-1"
    });
    mocks.tx.chapter.findFirst
      .mockResolvedValueOnce({
        order: 2
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        order: 3
      })
      .mockResolvedValueOnce(null);
    mocks.tx.chapter.create
      .mockRejectedValueOnce(
        new PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "test"
        })
      )
      .mockResolvedValueOnce({
        slug: "chapter-4",
        title: "第 4 章",
        order: 4
      });

    const result = await createChapter("glass-city");

    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(mocks.tx.chapter.create).toHaveBeenNthCalledWith(1, {
      data: {
        novelId: "novel-1",
        slug: "chapter-3",
        title: "第 3 章",
        order: 3,
        content: [],
        plainText: "",
        wordCount: 0
      },
      select: {
        slug: true,
        title: true,
        order: true
      }
    });
    expect(mocks.tx.chapter.create).toHaveBeenNthCalledWith(2, {
      data: {
        novelId: "novel-1",
        slug: "chapter-4",
        title: "第 4 章",
        order: 4,
        content: [],
        plainText: "",
        wordCount: 0
      },
      select: {
        slug: true,
        title: true,
        order: true
      }
    });
    expect(result).toEqual({
      chapter: {
        slug: "chapter-4",
        title: "第 4 章",
        order: 4
      }
    });
  });
});
