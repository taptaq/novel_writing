import { describe, expect, it } from "vitest";
import {
  addCharacterSeed,
  applyParsedSetupDraft,
  canParseSetupSource,
  createEmptyCharacterSeed,
  createInitialCharacterSeeds,
  createInitialParsedGraphDraft,
  createInitialParsedSetupDraft,
  extractParsedSetupGraphDraft,
  formatRelationPreview,
  mergeParsedSetupGraphDraft,
  removeCharacterSeed
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
