import { describe, expect, it } from "vitest";
import type { GraphEdgeSummary } from "@/types/domain";
import {
  buildInitialGraphSeed,
  buildNovelCreationInput,
  novelCreationSchema
} from "@/lib/novel-creation";

const payload = {
  title: "玻璃城遗闻",
  category: "奇幻",
  subGenre: "都市奇想",
  targetAudience: "女频成长向",
  premise: "一位档案修复师在倒塌前的玻璃城里寻找失踪姐姐留下的第二份遗嘱。",
  narrativeView: "第三人称有限视角",
  storyStructure: "三幕结构",
  plannedChapterCount: 24,
  targetWordsPerChapter: 3200,
  worldSeed: "玻璃城的记忆会在夜间折射成第二现实。",
  styleGoal: "克制、冷感、观察细。",
  characterSeeds: [
    {
      name: "祝衡",
      role: "档案修复师",
      summary: "不信预言，但靠修复他人的遗物谋生。",
      factionName: "城档馆",
      locationName: "下城档案塔"
    },
    {
      name: "林晞",
      role: "失踪的姐姐",
      summary: "曾经负责玻璃城夜间测绘。",
      factionName: "夜测队",
      locationName: "镜坡"
    }
  ],
  relationSeeds: [
    {
      sourceName: "祝衡",
      targetName: "林晞",
      type: "FAMILY" as const,
      description: "姐妹关系，且失踪事件是主线起点。",
      remark: "主线绑定",
      note: "第一阶段图谱备注"
    }
  ]
};

const graphEdgeContract = {
  id: "edge-1",
  sourceId: "character-1",
  targetId: "character-2",
  type: "FAMILY",
  description: "姐妹关系",
  remark: "主线绑定",
  note: "第一阶段图谱备注"
} satisfies GraphEdgeSummary;

describe("novelCreationSchema", () => {
  it("keeps graph edge contract fields for description, remark, and note", () => {
    expect(graphEdgeContract.remark).toBe("主线绑定");
    expect(graphEdgeContract.note).toBe("第一阶段图谱备注");
  });

  it("accepts a full first-phase novel creation payload", () => {
    const parsed = novelCreationSchema.parse(payload);

    expect(parsed.title).toBe("玻璃城遗闻");
    expect(parsed.relationSeeds[0].remark).toBe("主线绑定");
    expect(parsed.relationSeeds[0].note).toBe("第一阶段图谱备注");
  });

  it("rejects empty core fields", () => {
    expect(() => novelCreationSchema.parse({ ...payload, title: "" })).toThrow();
  });

  it("rejects duplicate character names", () => {
    expect(() =>
      novelCreationSchema.parse({
        ...payload,
        characterSeeds: [
          ...payload.characterSeeds,
          {
            name: " 祝衡 ",
            role: "替身",
            summary: "重名输入",
            factionName: "别馆",
            locationName: "北塔"
          }
        ]
      })
    ).toThrow(/人物姓名/);
  });

  it("rejects cross-type graph name collisions", () => {
    expect(() =>
      novelCreationSchema.parse({
        ...payload,
        characterSeeds: [
          {
            ...payload.characterSeeds[0],
            factionName: "林晞"
          },
          payload.characterSeeds[1]
        ]
      })
    ).toThrow(/图谱实体名称/);
  });

  it("allows shared faction and location names across different characters", () => {
    const parsed = novelCreationSchema.parse({
      ...payload,
      characterSeeds: [
        {
          ...payload.characterSeeds[0],
          factionName: "城档馆",
          locationName: "下城档案塔"
        },
        {
          ...payload.characterSeeds[1],
          factionName: "城档馆",
          locationName: "下城档案塔"
        }
      ]
    });

    expect(parsed.characterSeeds).toHaveLength(2);
    expect(parsed.characterSeeds[0].factionName).toBe("城档馆");
    expect(parsed.characterSeeds[1].locationName).toBe("下城档案塔");
  });
});

describe("buildInitialGraphSeed", () => {
  it("creates character, faction, and location seeds without duplicates", () => {
    const seed = buildInitialGraphSeed(payload);
    const familyRelation = seed.relations.find(
      (item) => item.sourceName === "祝衡" && item.targetName === "林晞" && item.type === "FAMILY"
    );

    expect(
      new Set(seed.entities.map((item) => `${item.type}:${item.name}`))
    ).toEqual(
      new Set([
        "CHARACTER:祝衡",
        "CHARACTER:林晞",
        "FACTION:城档馆",
        "FACTION:夜测队",
        "LOCATION:下城档案塔",
        "LOCATION:镜坡"
      ])
    );
    expect(seed.relations).toHaveLength(5);
    expect(familyRelation).toMatchObject({
      remark: "主线绑定",
      note: "第一阶段图谱备注"
    });
  });

  it("deduplicates shared faction and location entities referenced by multiple characters", () => {
    const seed = buildInitialGraphSeed({
      ...payload,
      characterSeeds: [
        {
          ...payload.characterSeeds[0],
          factionName: "城档馆",
          locationName: "下城档案塔"
        },
        {
          ...payload.characterSeeds[1],
          factionName: "城档馆",
          locationName: "下城档案塔"
        }
      ]
    });

    expect(
      seed.entities.filter((item) => item.type === "FACTION" && item.name === "城档馆")
    ).toHaveLength(1);
    expect(
      seed.entities.filter((item) => item.type === "LOCATION" && item.name === "下城档案塔")
    ).toHaveLength(1);
  });

  it("drops explicit relations whose endpoints do not resolve to created entities", () => {
    const seed = buildInitialGraphSeed({
      ...payload,
      relationSeeds: [
        payload.relationSeeds[0],
        {
          sourceName: "祝衡",
          targetName: "不存在的盟友",
          type: "ALLY",
          description: "不应保留",
          remark: "悬空关系"
        }
      ]
    });

    expect(
      seed.relations.filter(
        (item) => item.sourceName === "祝衡" && item.targetName === "不存在的盟友"
      )
    ).toEqual([]);
  });

  it("normalizes whitespace when called directly with non-normalized input", () => {
    const seed = buildInitialGraphSeed({
      ...payload,
      characterSeeds: [
        {
          name: " 祝衡 ",
          role: " 档案修复师 ",
          summary: " ",
          factionName: " 城档馆 ",
          locationName: " 下城档案塔 "
        }
      ],
      relationSeeds: [
        {
          sourceName: " 祝衡 ",
          targetName: " 城档馆 ",
          type: "MEMBER_OF",
          description: " 隶属关系 ",
          remark: " 主要组织 ",
          note: " 手动输入 "
        }
      ]
    });
    const membershipRelation = seed.relations.find(
      (item) =>
        item.sourceName === "祝衡" && item.targetName === "城档馆" && item.type === "MEMBER_OF"
    );

    expect(seed.entities).toHaveLength(3);
    expect(seed.entities.map((item) => item.name)).toEqual(["祝衡", "城档馆", "下城档案塔"]);
    expect(seed.entities[0].summary).toBe("档案修复师");
    expect(membershipRelation).toMatchObject({
      sourceName: "祝衡",
      targetName: "城档馆",
      description: "隶属关系",
      remark: "主要组织",
      note: "手动输入"
    });
  });

  it("skips invalid direct-call characters that normalize to empty names", () => {
    const seed = buildInitialGraphSeed({
      ...payload,
      characterSeeds: [
        {
          name: "   ",
          role: "幽灵角色",
          summary: "不应生成实体",
          factionName: "雾社",
          locationName: "空港"
        },
        {
          name: "祝衡",
          role: "档案修复师",
          summary: "保留有效角色",
          factionName: "城档馆",
          locationName: "下城档案塔"
        }
      ],
      relationSeeds: [
        {
          sourceName: "   ",
          targetName: "祝衡",
          type: "ALLY",
          description: "无效来源"
        },
        {
          sourceName: "祝衡",
          targetName: "   ",
          type: "ALLY",
          description: "无效目标"
        }
      ]
    });

    expect(seed.entities.map((item) => `${item.type}:${item.name}`)).toEqual([
      "CHARACTER:祝衡",
      "FACTION:城档馆",
      "LOCATION:下城档案塔"
    ]);
    expect(
      seed.relations.some((item) => item.sourceName === "" || item.targetName === "")
    ).toBe(false);
  });

  it("deduplicates duplicate normalized character names for direct callers", () => {
    const seed = buildInitialGraphSeed({
      ...payload,
      characterSeeds: [
        {
          name: "祝衡",
          role: "档案修复师",
          summary: "原始角色",
          factionName: "城档馆",
          locationName: "下城档案塔"
        },
        {
          name: " 祝衡 ",
          role: "重复角色",
          summary: "不应再生成第二个角色节点",
          factionName: "别馆",
          locationName: "北塔"
        }
      ],
      relationSeeds: [
        {
          sourceName: "祝衡",
          targetName: "别馆",
          type: "ALLY",
          description: "应被过滤，因别馆不应存活"
        }
      ]
    });

    expect(
      seed.entities.filter((item) => item.type === "CHARACTER" && item.name === "祝衡")
    ).toHaveLength(1);
    expect(seed.entities.some((item) => item.name === "别馆")).toBe(false);
    expect(
      seed.relations.some((item) => item.sourceName === "祝衡" && item.targetName === "别馆")
    ).toBe(false);
  });

  it("drops cross-type name collisions for direct callers and filters relations against survivors", () => {
    const seed = buildInitialGraphSeed({
      ...payload,
      characterSeeds: [
        {
          name: "祝衡",
          role: "档案修复师",
          summary: "保留角色",
          factionName: "城档馆",
          locationName: "下城档案塔"
        },
        {
          name: "林晞",
          role: "失踪的姐姐",
          summary: "角色名与势力名冲突",
          factionName: "祝衡",
          locationName: "镜坡"
        }
      ],
      relationSeeds: [
        {
          sourceName: "林晞",
          targetName: "祝衡",
          type: "ALLY",
          description: "保留，两个角色都存活"
        },
        {
          sourceName: "祝衡",
          targetName: "城档馆",
          type: "MEMBER_OF",
          description: "保留，有效势力"
        }
      ]
    });

    expect(
      seed.entities.filter((item) => item.type === "CHARACTER" && item.name === "祝衡")
    ).toHaveLength(1);
    expect(
      seed.entities.filter((item) => item.type === "FACTION" && item.name === "祝衡")
    ).toHaveLength(0);
    expect(
      seed.relations.every((item) =>
        seed.entities.some((entity) => entity.name === item.sourceName) &&
        seed.entities.some((entity) => entity.name === item.targetName)
      )
    ).toBe(true);
  });

  it("does not generate MEMBER_OF or ROOTED_IN edges to surviving characters after collisions", () => {
    const seed = buildInitialGraphSeed({
      ...payload,
      characterSeeds: [
        {
          name: "祝衡",
          role: "档案修复师",
          summary: "保留角色",
          factionName: "城档馆",
          locationName: "下城档案塔"
        },
        {
          name: "林晞",
          role: "失踪的姐姐",
          summary: "人物名会吞掉同名势力与地点",
          factionName: "祝衡",
          locationName: "祝衡"
        }
      ]
    });

    expect(
      seed.relations.some(
        (item) =>
          item.sourceName === "林晞" &&
          item.targetName === "祝衡" &&
          item.type === "MEMBER_OF"
      )
    ).toBe(false);
    expect(
      seed.relations.some(
        (item) =>
          item.sourceName === "林晞" &&
          item.targetName === "祝衡" &&
          item.type === "ROOTED_IN"
      )
    ).toBe(false);
  });

  it("drops explicit MEMBER_OF and ROOTED_IN relations when surviving entity kinds are invalid", () => {
    const seed = buildInitialGraphSeed({
      ...payload,
      characterSeeds: [
        {
          name: "祝衡",
          role: "档案修复师",
          summary: "保留角色",
          factionName: "城档馆",
          locationName: "下城档案塔"
        },
        {
          name: "林晞",
          role: "失踪的姐姐",
          summary: "角色名与地名冲突",
          factionName: "夜测队",
          locationName: "镜坡"
        }
      ],
      relationSeeds: [
        {
          sourceName: "林晞",
          targetName: "祝衡",
          type: "MEMBER_OF",
          description: "错误地指向角色"
        },
        {
          sourceName: "夜测队",
          targetName: "镜坡",
          type: "ROOTED_IN",
          description: "错误来源不是角色"
        },
        {
          sourceName: "祝衡",
          targetName: "下城档案塔",
          type: "ROOTED_IN",
          description: "有效显式地点关系"
        }
      ]
    });

    expect(
      seed.relations.some(
        (item) =>
          item.sourceName === "林晞" &&
          item.targetName === "祝衡" &&
          item.type === "MEMBER_OF"
      )
    ).toBe(false);
    expect(
      seed.relations.some(
        (item) =>
          item.sourceName === "夜测队" &&
          item.targetName === "镜坡" &&
          item.type === "ROOTED_IN"
      )
    ).toBe(false);
    expect(
      seed.relations.some(
        (item) =>
          item.sourceName === "祝衡" &&
          item.targetName === "下城档案塔" &&
          item.type === "ROOTED_IN"
      )
    ).toBe(true);
  });
});

describe("buildNovelCreationInput", () => {
  it("maps creation payload into novel metadata and graph seed inputs", () => {
    const input = buildNovelCreationInput(payload);
    const characterEntity = input.graph.entities.find((item) => item.name === "祝衡");
    const familyRelation = input.graph.relations.find(
      (item) => item.sourceName === "祝衡" && item.targetName === "林晞" && item.type === "FAMILY"
    );

    expect(input.novel.storyStructure).toBe("三幕结构");
    expect(input.novel.worldSeed).toBe("玻璃城的记忆会在夜间折射成第二现实。");
    expect(input.novel.styleGoal).toBe("克制、冷感、观察细。");
    expect(characterEntity?.type).toBe("CHARACTER");
    expect(familyRelation).toMatchObject({
      type: "FAMILY",
      remark: "主线绑定",
      note: "第一阶段图谱备注"
    });
  });
});
