import { describe, expect, it } from "vitest";
import {
  addCharacterSeed,
  applyParsedSetupDraft,
  canParseSetupSource,
  createEmptyCharacterSeed,
  createInitialCharacterSeeds,
  createInitialParsedSetupDraft,
  removeCharacterSeed
} from "@/components/novel-creation-form";

describe("character seed helpers", () => {
  it("starts with exactly one empty character seed by default", () => {
    const seeds = createInitialCharacterSeeds();

    expect(seeds).toHaveLength(1);
    expect(seeds[0]).toEqual(createEmptyCharacterSeed());
  });

  it("adds character seeds until the list reaches three items", () => {
    const initialSeeds = createInitialCharacterSeeds();
    const twoSeeds = addCharacterSeed(initialSeeds);
    const threeSeeds = addCharacterSeed(twoSeeds);
    const cappedSeeds = addCharacterSeed(threeSeeds);

    expect(twoSeeds).toHaveLength(2);
    expect(threeSeeds).toHaveLength(3);
    expect(cappedSeeds).toHaveLength(3);
    expect(cappedSeeds).toEqual(threeSeeds);
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
  it("only enables setup parsing when text or a file source exists", () => {
    expect(canParseSetupSource("", "")).toBe(false);
    expect(canParseSetupSource("  ", "")).toBe(false);
    expect(canParseSetupSource("设定文本", "")).toBe(true);
    expect(canParseSetupSource("", "setup.md")).toBe(true);
  });

  it("creates an empty parsed setup draft container by default", () => {
    expect(createInitialParsedSetupDraft()).toEqual({
      styleSamples: [],
      characterSeeds: [],
      guessedFields: [],
      missingFields: [],
      confidenceNotes: []
    });
  });

  it("replaces form fields and parsed character seeds when applying all", () => {
    const draft = createInitialParsedSetupDraft();
    draft.title = "雾港回声";
    draft.premise = "她必须在沉港彻底下沉前找到会说谎的灯塔。";
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
          { title: "", content: "", note: "" },
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
    expect(result.characterSeeds).toHaveLength(3);
    expect(result.characterSeeds[0].name).toBe("沈砚");
    expect(result.characterSeeds[1].name).toBe("周棠");
    expect(result.characterSeeds[2].name).toBe("林渡");
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
