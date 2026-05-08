import { describe, expect, it } from "vitest";
import {
  normalizeParsedSetupDraft,
  parsedSetupDraftSchema
} from "@/lib/novel-setup-parser";

describe("parsedSetupDraftSchema", () => {
  it("trims top-level strings and applies defaults", () => {
    expect(
      parsedSetupDraftSchema.parse({
        title: "  雾港航线  ",
        category: "  奇幻  ",
        subGenre: "  蒸汽悬疑  ",
        targetAudience: "  青年向  ",
        premise: "  一座失准的潮汐钟牵出城市秘密。  ",
        narrativeView: "  第三人称限知  ",
        storyStructure: "  三幕式  ",
        worldSeed: "  雾港、钟楼与旧档案塔。  ",
        styleGoal: "  冷感、克制、贴身。  ",
        styleSamples: [
          {
            title: "  冷雨开场  ",
            content: "  她没有立刻回头，只是把灯绳又绕了一圈，等雨声先落稳。  ",
            note: "  偏克制  "
          }
        ],
        factionSeeds: [
          {
            name: "  城档馆  ",
            summary: "  旧港最早的档案修复机构。  "
          }
        ],
        locationSeeds: [
          {
            name: "  下城档案塔  ",
            summary: "  保存旧港潮汐档案的高塔。  "
          }
        ],
        characterSeeds: [
          {
            name: "  沈砚  ",
            role: "  档案修复师  ",
            summary: "  擅长从细节找裂缝。  ",
            factionName: "  城档馆  ",
            locationName: "  下城档案塔  "
          }
        ],
        relationSeeds: [
          {
            sourceName: "  沈砚  ",
            targetName: "  城档馆  ",
            type: "MEMBER_OF",
            description: "  沈砚长期在城档馆修复旧档案。  "
          }
        ]
      })
    ).toEqual({
      title: "雾港航线",
      category: "奇幻",
      subGenre: "蒸汽悬疑",
      targetAudience: "青年向",
      premise: "一座失准的潮汐钟牵出城市秘密。",
      narrativeView: "第三人称限知",
      storyStructure: "三幕式",
      lengthCategory: "MEDIUM",
      plannedChapterCount: undefined,
      targetWordsPerChapter: undefined,
      worldSeed: "雾港、钟楼与旧档案塔。",
      styleGoal: "冷感、克制、贴身。",
      styleSamples: [
        {
          title: "冷雨开场",
          content: "她没有立刻回头，只是把灯绳又绕了一圈，等雨声先落稳。",
          note: "偏克制"
        }
      ],
      factionSeeds: [
        {
          name: "城档馆",
          summary: "旧港最早的档案修复机构。"
        }
      ],
      locationSeeds: [
        {
          name: "下城档案塔",
          summary: "保存旧港潮汐档案的高塔。"
        }
      ],
      characterSeeds: [
        {
          name: "沈砚",
          role: "档案修复师",
          summary: "擅长从细节找裂缝。",
          factionName: "城档馆",
          locationName: "下城档案塔"
        }
      ],
      relationSeeds: [
        {
          sourceName: "沈砚",
          targetName: "城档馆",
          type: "MEMBER_OF",
          description: "沈砚长期在城档馆修复旧档案。",
          remark: "",
          note: ""
        }
      ],
      guessedFields: [],
      missingFields: [],
      confidenceNotes: []
    });
  });

  it("rejects more than 3 style samples", () => {
    expect(
      parsedSetupDraftSchema.safeParse({
        styleSamples: [
          { content: "第一段参考样文长度足够长，可以通过最小长度限制。", title: "1" },
          { content: "第二段参考样文长度足够长，可以通过最小长度限制。", title: "2" },
          { content: "第三段参考样文长度足够长，可以通过最小长度限制。", title: "3" },
          { content: "第四段参考样文长度足够长，可以通过最小长度限制。", title: "4" }
        ],
        characterSeeds: [
          { name: "甲" },
          { name: "乙" },
          { name: "丙" },
          { name: "丁" }
        ]
      }).success
    ).toBe(false);
  });

  it("accepts any number of parsed character seeds", () => {
    expect(
      parsedSetupDraftSchema.safeParse({
        characterSeeds: [
          { name: "甲" },
          { name: "乙" },
          { name: "丙" },
          { name: "丁" },
          { name: "戊" }
        ]
      }).success
    ).toBe(true);
  });

  it("rejects style sample content shorter than 20 characters and empty character names", () => {
    expect(
      parsedSetupDraftSchema.safeParse({
        styleSamples: [{ content: "太短了，不够。", title: "短样文" }],
        characterSeeds: [{ name: "   " }]
      }).success
    ).toBe(false);
  });
});

describe("normalizeParsedSetupDraft", () => {
  it("coerces unknown input to an object with safe defaults", () => {
    expect(normalizeParsedSetupDraft(null)).toEqual({
      title: "",
      category: "",
      subGenre: "",
      targetAudience: "",
      premise: "",
      narrativeView: "",
      storyStructure: "",
      lengthCategory: "MEDIUM",
      plannedChapterCount: undefined,
      targetWordsPerChapter: undefined,
      worldSeed: "",
      styleGoal: "",
      styleSamples: [],
      factionSeeds: [],
      locationSeeds: [],
      characterSeeds: [],
      relationSeeds: [],
      guessedFields: [],
      missingFields: [],
      confidenceNotes: []
    });
  });

  it("keeps all valid character seeds, caps style samples at 3, and skips invalid entries", () => {
    expect(
      normalizeParsedSetupDraft({
        title: "  雾港航线 ",
        lengthCategory: "EPIC",
        styleSamples: [
          { title: "一", content: "第一段参考样文长度足够长，可以通过最小长度限制。" },
          { title: "二", content: "第二段参考样文长度足够长，可以通过最小长度限制。" },
          { title: "三", content: "第三段参考样文长度足够长，可以通过最小长度限制。" },
          { title: "四", content: "太短" }
        ],
        characterSeeds: [
          { name: " 沈砚 ", role: " 档案修复师 " },
          { name: " 林渡 " },
          { name: " 周棠 ", factionName: " 雾社 " },
          { name: " 苏枕 ", locationName: " 北钟塔 " },
          { name: "   ", summary: "无效" }
        ],
        factionSeeds: [
          { name: " 雾社 ", summary: " 港口地下情报组织 " },
          { name: " 守钟会 " }
        ],
        locationSeeds: [
          { name: " 北钟塔 ", summary: " 潮汐钟核心区域 " },
          { name: " 白雾码头 " }
        ],
        relationSeeds: [
          { sourceName: " 沈砚 ", targetName: " 雾社 ", type: "ALLY", description: " 暂时合作 " },
          { sourceName: " 苏枕 ", targetName: " 北钟塔 ", type: "ROOTED_IN", description: " 长期驻守 " },
          { sourceName: "   ", targetName: " 白雾码头 ", type: "OTHER", description: "无效" }
        ],
        guessedFields: [" premise ", " narrativeView "],
        missingFields: [" worldSeed "],
        confidenceNotes: [" length inferred "]
      })
    ).toEqual({
      title: "雾港航线",
      category: "",
      subGenre: "",
      targetAudience: "",
      premise: "",
      narrativeView: "",
      storyStructure: "",
      lengthCategory: "MEDIUM",
      plannedChapterCount: undefined,
      targetWordsPerChapter: undefined,
      worldSeed: "",
      styleGoal: "",
      styleSamples: [
        { title: "一", content: "第一段参考样文长度足够长，可以通过最小长度限制。" },
        { title: "二", content: "第二段参考样文长度足够长，可以通过最小长度限制。" },
        { title: "三", content: "第三段参考样文长度足够长，可以通过最小长度限制。" }
      ],
      factionSeeds: [
        { name: "雾社", summary: "港口地下情报组织" },
        { name: "守钟会", summary: "" }
      ],
      locationSeeds: [
        { name: "北钟塔", summary: "潮汐钟核心区域" },
        { name: "白雾码头", summary: "" }
      ],
      characterSeeds: [
        { name: "沈砚", role: "档案修复师", summary: "", factionName: "", locationName: "" },
        { name: "林渡", role: "", summary: "", factionName: "", locationName: "" },
        { name: "周棠", role: "", summary: "", factionName: "雾社", locationName: "" },
        { name: "苏枕", role: "", summary: "", factionName: "", locationName: "北钟塔" }
      ],
      relationSeeds: [
        {
          sourceName: "沈砚",
          targetName: "雾社",
          type: "ALLY",
          description: "暂时合作",
          remark: "",
          note: ""
        },
        {
          sourceName: "苏枕",
          targetName: "北钟塔",
          type: "ROOTED_IN",
          description: "长期驻守",
          remark: "",
          note: ""
        }
      ],
      guessedFields: ["premise", "narrativeView"],
      missingFields: ["worldSeed"],
      confidenceNotes: ["length inferred"]
    });
  });

  it("validates array entries before applying the style sample cap", () => {
    expect(
      normalizeParsedSetupDraft({
        styleSamples: [
          { title: "坏样文", content: "太短" },
          { title: "空内容", content: "      " },
          { title: "一", content: "第一段参考样文长度足够长，可以通过最小长度限制。" },
          { title: "二", content: "第二段参考样文长度足够长，可以通过最小长度限制。" },
          { title: "三", content: "第三段参考样文长度足够长，可以通过最小长度限制。" },
          { title: "四", content: "第四段参考样文长度足够长，可以通过最小长度限制。" }
        ],
        characterSeeds: [
          { name: "   ", role: "无效角色" },
          { name: "", summary: "还是无效" },
          { name: " 沈砚 " },
          { name: " 林渡 " },
          { name: " 周棠 " },
          { name: " 苏枕 " }
        ],
        factionSeeds: [
          { name: "   ", summary: "无效势力" },
          { name: " 雾社 " }
        ],
        locationSeeds: [
          { name: "   ", summary: "无效地点" },
          { name: " 北钟塔 " }
        ],
        relationSeeds: [
          { sourceName: "   ", targetName: "北钟塔", type: "OTHER", description: "无效" },
          { sourceName: "沈砚", targetName: "雾社", type: "ALLY", description: "合作" }
        ]
      })
    ).toMatchObject({
      styleSamples: [
        { title: "一", content: "第一段参考样文长度足够长，可以通过最小长度限制。" },
        { title: "二", content: "第二段参考样文长度足够长，可以通过最小长度限制。" },
        { title: "三", content: "第三段参考样文长度足够长，可以通过最小长度限制。" }
      ],
      factionSeeds: [{ name: "雾社" }],
      locationSeeds: [{ name: "北钟塔" }],
      characterSeeds: [
        { name: "沈砚" },
        { name: "林渡" },
        { name: "周棠" },
        { name: "苏枕" }
      ],
      relationSeeds: [{ sourceName: "沈砚", targetName: "雾社", type: "ALLY" }]
    });
  });

  it("accepts positive integer strings from model output", () => {
    expect(
      normalizeParsedSetupDraft({
        plannedChapterCount: "18",
        targetWordsPerChapter: "3000",
        guessedFields: [" plannedChapterCount "]
      })
    ).toMatchObject({
      plannedChapterCount: 18,
      targetWordsPerChapter: 3000,
      guessedFields: ["plannedChapterCount"]
    });
  });

  it("drops cross-type duplicate graph entities during parse normalization", () => {
    expect(
      normalizeParsedSetupDraft({
        factionSeeds: [
          { name: "愉悦小镇", summary: "AI 误识别成势力。" },
          { name: "巡夜队", summary: "本地守卫组织。" }
        ],
        locationSeeds: [{ name: "愉悦小镇", summary: "故事主场景。" }],
        characterSeeds: [
          {
            name: "沈砚",
            locationName: "愉悦小镇"
          },
          {
            name: "周棠",
            factionName: "巡夜队"
          }
        ],
        relationSeeds: [
          {
            sourceName: "沈砚",
            targetName: "愉悦小镇",
            type: "ROOTED_IN",
            description: "长期生活在这里。"
          },
          {
            sourceName: "周棠",
            targetName: "巡夜队",
            type: "MEMBER_OF",
            description: "隶属巡夜队。"
          },
          {
            sourceName: "沈砚",
            targetName: "愉悦小镇",
            type: "MEMBER_OF",
            description: "错误地把地点当势力。"
          }
        ]
      })
    ).toMatchObject({
      factionSeeds: [{ name: "巡夜队", summary: "本地守卫组织。" }],
      locationSeeds: [{ name: "愉悦小镇", summary: "故事主场景。" }],
      characterSeeds: [
        { name: "沈砚", locationName: "愉悦小镇" },
        { name: "周棠", factionName: "巡夜队" }
      ],
      relationSeeds: [
        {
          sourceName: "沈砚",
          targetName: "愉悦小镇",
          type: "ROOTED_IN",
          description: "长期生活在这里。"
        },
        {
          sourceName: "周棠",
          targetName: "巡夜队",
          type: "MEMBER_OF",
          description: "隶属巡夜队。"
        }
      ]
    });
  });
});
