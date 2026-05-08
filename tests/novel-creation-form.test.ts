import { describe, expect, it } from "vitest";
import {
  addCharacterSeed,
  addStyleSample,
  applyParsedSetupDraft,
  buildNovelCreationPayload,
  canParseSetupSource,
  createEmptyCharacterSeed,
  createInitialCharacterSeeds,
  createInitialStyleSamples,
  createInitialParsedGraphDraft,
  createInitialParsedSetupDraft,
  extractParsedSetupGraphDraft,
  formatRelationPreview,
  getSetupSourceFieldState,
  mergeParsedSetupGraphDraft,
  removeCharacterSeed,
  validateNovelCreationPayload,
  validateNovelCreationSubmission
} from "@/components/novel-creation-form";

describe("character seed helpers", () => {
  it("starts with exactly one empty character seed by default", () => {
    const seeds = createInitialCharacterSeeds();

    expect(seeds).toHaveLength(1);
    expect(seeds[0]).toEqual(createEmptyCharacterSeed());
  });

  it("adds character seeds without a fixed upper limit", () => {
    const initialSeeds = createInitialCharacterSeeds();
    const twoSeeds = addCharacterSeed(initialSeeds);
    const threeSeeds = addCharacterSeed(twoSeeds);
    const fourSeeds = addCharacterSeed(threeSeeds);

    expect(twoSeeds).toHaveLength(2);
    expect(threeSeeds).toHaveLength(3);
    expect(fourSeeds).toHaveLength(4);
  });

  it("never removes the last remaining character seed", () => {
    const singleSeed = createInitialCharacterSeeds();
    const threeSeeds = addCharacterSeed(addCharacterSeed(singleSeed));
    const twoSeeds = removeCharacterSeed(threeSeeds, 1);
    const oneSeed = removeCharacterSeed(twoSeeds, 0);
    const stillOneSeed = removeCharacterSeed(oneSeed, 0);

    expect(twoSeeds).toHaveLength(2);
    expect(oneSeed).toHaveLength(1);
    expect(stillOneSeed).toHaveLength(1);
    expect(stillOneSeed).toEqual(oneSeed);
  });
});

describe("style sample helpers", () => {
  it("starts with one empty style sample by default", () => {
    const samples = createInitialStyleSamples();

    expect(samples).toHaveLength(1);
    expect(samples[0]).toEqual({
      title: "",
      content: "",
      note: ""
    });
  });

  it("adds style samples without changing the existing ones", () => {
    const initialSamples = createInitialStyleSamples();
    const nextSamples = addStyleSample(initialSamples);

    expect(nextSamples).toHaveLength(2);
    expect(nextSamples[0]).toEqual(initialSamples[0]);
    expect(nextSamples[1]).toEqual({
      title: "",
      content: "",
      note: ""
    });
  });
});

describe("parsed setup helpers", () => {
  it("formats relation preview copy in plain Chinese", () => {
    expect(
      formatRelationPreview({
        sourceName: "沈砚",
        targetName: "城档馆",
        type: "MEMBER_OF"
      })
    ).toBe("沈砚 属于 城档馆");

    expect(
      formatRelationPreview({
        sourceName: "周棠",
        targetName: "顾衍",
        type: "MENTOR"
      })
    ).toBe("周棠 把 顾衍 当老师");

    expect(
      formatRelationPreview({
        sourceName: "苏枕",
        targetName: "北钟塔",
        type: "ROOTED_IN"
      })
    ).toBe("苏枕 常驻 北钟塔");

    expect(
      formatRelationPreview({
        sourceName: "林渡",
        targetName: "港务署",
        type: "SUBORDINATE"
      })
    ).toBe("林渡 是 港务署 的下属");
  });

  it("only enables setup parsing when text or a file source exists", () => {
    expect(canParseSetupSource("", "")).toBe(false);
    expect(canParseSetupSource("  ", "")).toBe(false);
    expect(canParseSetupSource("设定文本", "")).toBe(true);
    expect(canParseSetupSource("", "setup.md")).toBe(true);
  });

  it("locks both setup source inputs while ai parsing is running", () => {
    expect(getSetupSourceFieldState(false)).toEqual({
      isTextInputDisabled: false,
      isFileInputDisabled: false
    });

    expect(getSetupSourceFieldState(true)).toEqual({
      isTextInputDisabled: true,
      isFileInputDisabled: true
    });
  });

  it("creates an empty parsed setup draft container by default", () => {
    expect(createInitialParsedSetupDraft()).toEqual({
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

  it("extracts graph draft seeds from parsed setup results", () => {
    const draft = createInitialParsedSetupDraft();
    draft.factionSeeds = [{ name: "城档馆", summary: "旧港档案机构" }];
    draft.locationSeeds = [{ name: "北钟塔", summary: "核心钟塔" }];
    draft.relationSeeds = [
      {
        sourceName: "沈砚",
        targetName: "城档馆",
        type: "MEMBER_OF",
        description: "长期在馆内工作"
      }
    ];

    expect(extractParsedSetupGraphDraft(draft)).toEqual({
      factionSeeds: [{ name: "城档馆", summary: "旧港档案机构" }],
      locationSeeds: [{ name: "北钟塔", summary: "核心钟塔" }],
      relationSeeds: [
        {
          sourceName: "沈砚",
          targetName: "城档馆",
          type: "MEMBER_OF",
          description: "长期在馆内工作",
          remark: "",
          note: ""
        }
      ]
    });
  });

  it("only fills empty parsed graph draft sections when using fill-empty mode", () => {
    const draft = createInitialParsedSetupDraft();
    draft.factionSeeds = [{ name: "城档馆", summary: "旧港档案机构" }];
    draft.locationSeeds = [{ name: "北钟塔", summary: "核心钟塔" }];
    draft.relationSeeds = [
      {
        sourceName: "沈砚",
        targetName: "城档馆",
        type: "MEMBER_OF",
        description: "长期在馆内工作"
      }
    ];

    const merged = mergeParsedSetupGraphDraft(
      {
        factionSeeds: [{ name: "旧势力", summary: "" }],
        locationSeeds: [],
        relationSeeds: []
      },
      draft,
      "fill_empty"
    );

    expect(merged).toEqual({
      factionSeeds: [{ name: "旧势力", summary: "" }],
      locationSeeds: [{ name: "北钟塔", summary: "核心钟塔" }],
      relationSeeds: [
        {
          sourceName: "沈砚",
          targetName: "城档馆",
          type: "MEMBER_OF",
          description: "长期在馆内工作",
          remark: "",
          note: ""
        }
      ]
    });
  });

  it("replaces form fields and keeps all parsed character seeds when applying all", () => {
    const draft = createInitialParsedSetupDraft();
    draft.title = "雾港回声";
    draft.premise = "她必须在沉港彻底下沉前找到会说谎的灯塔。";
    draft.styleSamples = [
      {
        title: "新样文",
        content: "这是一段新的文风样文，但不应该在应用全部时覆盖表单里的文风参考。",
        note: "不该自动写入"
      }
    ];
    draft.characterSeeds = [
      {
        name: "沈砚",
        role: "打捞员"
      },
      {
        name: "周棠",
        summary: "守塔人"
      },
      {
        name: "林渡",
        factionName: "雾港署"
      },
      {
        name: "苏枕",
        locationName: "北钟塔"
      }
    ];

    const result = applyParsedSetupDraft(
      {
        title: "旧标题",
        category: "",
        subGenre: "",
        targetAudience: "",
        premise: "",
        narrativeView: "第三人称有限视角",
        storyStructure: "三幕结构",
        lengthCategory: "MEDIUM",
        plannedChapterCount: "",
        targetWordsPerChapter: "",
        worldSeed: "",
        styleGoal: "",
        styleSamples: [
          { title: "保留样文", content: "这段原有样文需要保留，不要被解析结果直接覆盖。", note: "" },
          { title: "", content: "", note: "" },
          { title: "", content: "", note: "" }
        ],
        characterSeeds: createInitialCharacterSeeds()
      },
      draft,
      "replace_all"
    );

    expect(result.title).toBe("雾港回声");
    expect(result.premise).toBe("她必须在沉港彻底下沉前找到会说谎的灯塔。");
    expect(result.styleSamples[0]).toMatchObject({
      title: "保留样文",
      content: "这段原有样文需要保留，不要被解析结果直接覆盖。"
    });
    expect(result.characterSeeds).toHaveLength(4);
    expect(result.characterSeeds[0].name).toBe("沈砚");
    expect(result.characterSeeds[1].name).toBe("周棠");
    expect(result.characterSeeds[2].name).toBe("林渡");
    expect(result.characterSeeds[3].name).toBe("苏枕");
  });

  it("fills only empty fields and preserves partially filled character cards", () => {
    const draft = createInitialParsedSetupDraft();
    draft.title = "不会覆盖";
    draft.premise = "新 premise";
    draft.characterSeeds = [
      {
        name: "沈砚",
        role: "新身份",
        summary: "新简述"
      },
      {
        name: "周棠",
        role: "守塔人"
      }
    ];

    const result = applyParsedSetupDraft(
      {
        title: "已有标题",
        category: "",
        subGenre: "",
        targetAudience: "",
        premise: "",
        narrativeView: "第三人称有限视角",
        storyStructure: "三幕结构",
        lengthCategory: "MEDIUM",
        plannedChapterCount: "",
        targetWordsPerChapter: "",
        worldSeed: "",
        styleGoal: "",
        styleSamples: [
          { title: "", content: "", note: "" },
          { title: "", content: "", note: "" },
          { title: "", content: "", note: "" }
        ],
        characterSeeds: [
          {
            name: "已有角色",
            role: "主角",
            summary: ""
          }
        ]
      },
      draft,
      "fill_empty"
    );

    expect(result.title).toBe("已有标题");
    expect(result.premise).toBe("新 premise");
    expect(result.characterSeeds).toHaveLength(2);
    expect(result.characterSeeds[0]).toMatchObject({
      name: "已有角色",
      role: "主角",
      summary: ""
    });
    expect(result.characterSeeds[1]).toMatchObject({
      name: "周棠",
      role: "守塔人"
    });
  });
});

describe("novel creation submission validation", () => {
  it("rejects short style samples before submit", () => {
    expect(
      validateNovelCreationSubmission({
        title: "玻璃城遗闻",
        category: "奇幻",
        subGenre: "都市奇想",
        targetAudience: "女频成长向",
        premise: "一位档案修复师在倒塌前的玻璃城里寻找失踪姐姐留下的第二份遗嘱。",
        styleSamples: [
          {
            title: "短样文",
            content: "她没有立刻回头，只把灯绳绕了一圈。",
            note: ""
          }
        ]
      })
    ).toBe("参考样文至少需要 20 个字符。");
  });

  it("rejects schema-invalid payloads before the create request is sent", () => {
    expect(
      validateNovelCreationPayload({
        title: "玻璃城遗闻",
        category: "奇幻",
        subGenre: "都市奇想",
        targetAudience: "女频成长向",
        premise: "一位档案修复师在倒塌前的玻璃城里寻找失踪姐姐留下的第二份遗嘱。",
        narrativeView: "第三人称有限视角",
        storyStructure: "三幕结构",
        lengthCategory: "LONG",
        plannedChapterCount: 24,
        targetWordsPerChapter: 3200,
        worldSeed: "玻璃城的记忆会在夜间折射成第二现实。",
        styleGoal: "克制、冷感、观察细。",
        styleSamples: [],
        factionSeeds: [],
        locationSeeds: [],
        characterSeeds: [
          {
            name: "祝衡",
            role: "档案修复师",
            summary: "不信预言，但靠修复他人的遗物谋生。",
            factionName: "城档馆",
            locationName: "下城档案塔"
          },
          {
            name: "祝衡",
            role: "失踪的姐姐",
            summary: "重复姓名会触发 schema 校验。",
            factionName: "夜测队",
            locationName: "镜坡"
          }
        ],
        relationSeeds: []
      })
    ).toBe("人物姓名不能重复");
  });

  it("drops hidden graph seeds that conflict with character-derived location names", () => {
    const payload = buildNovelCreationPayload({
      title: "玻璃城遗闻",
      category: "奇幻",
      subGenre: "都市奇想",
      targetAudience: "女频成长向",
      premise: "一位档案修复师在倒塌前的玻璃城里寻找失踪姐姐留下的第二份遗嘱。",
      narrativeView: "第三人称有限视角",
      storyStructure: "三幕结构",
      lengthCategory: "LONG",
      plannedChapterCount: 24,
      targetWordsPerChapter: 3200,
      worldSeed: "玻璃城的记忆会在夜间折射成第二现实。",
      styleGoal: "克制、冷感、观察细。",
      styleSamples: [],
      factionSeeds: [{ name: "愉悦小镇", summary: "AI 误识别成势力。" }],
      locationSeeds: [{ name: "愉悦小镇", summary: "主场景地点。" }],
      characterSeeds: [
        {
          name: "祝衡",
          role: "档案修复师",
          summary: "住在愉悦小镇。",
          factionName: "",
          locationName: "愉悦小镇"
        }
      ],
      relationSeeds: [
        {
          sourceName: "祝衡",
          targetName: "愉悦小镇",
          type: "ROOTED_IN",
          description: "长期生活在这里。"
        }
      ]
    });

    expect(payload.factionSeeds).toEqual([]);
    expect(payload.locationSeeds).toEqual([{ name: "愉悦小镇", summary: "主场景地点。" }]);
    expect(payload.characterSeeds[0]?.locationName).toBe("愉悦小镇");
    expect(validateNovelCreationPayload(payload)).toBeNull();
  });
});
