import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    novel: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("@/lib/env", () => ({
  isDatabaseConfigured: true
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

import { getNovelGraphData } from "@/lib/repositories/novels";

describe("getNovelGraphData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns structured description, remark, and note for graph edges", async () => {
    mocks.prisma.novel.findUnique.mockResolvedValueOnce({
      id: "novel-1",
      slug: "glass-citadel",
      title: "玻璃城遗闻",
      premise: null,
      summary: null,
      genre: null,
      tone: null,
      status: "PLANNING",
      updatedAt: new Date("2026-04-27T00:00:00.000Z"),
      chapters: [],
      entities: [
        {
          id: "c1",
          name: "祝衡",
          type: "CHARACTER",
          summary: "档案修复师",
          tags: [],
          sourceRelations: [
            {
              id: "r1",
              sourceId: "c1",
              targetId: "f1",
              type: "OTHER",
              description: "隶属关系",
              remark: "主线绑定",
              note: "第一阶段图谱备注"
            }
          ]
        },
        {
          id: "f1",
          name: "城档馆",
          type: "FACTION",
          summary: "城市档案机构",
          tags: [],
          sourceRelations: []
        }
      ]
    });

    const graph = await getNovelGraphData("glass-citadel");

    expect(graph?.edges).toEqual([
      {
        id: "r1",
        sourceId: "c1",
        targetId: "f1",
        type: "OTHER",
        description: "隶属关系",
        remark: "主线绑定",
        note: "第一阶段图谱备注"
      }
    ]);
  });
});
