import { describe, expect, it } from "vitest";
import { getRecommendedNextStep } from "@/lib/novel-workflow";

describe("getRecommendedNextStep", () => {
  it("recommends adding key characters when there are no entities", () => {
    expect(
      getRecommendedNextStep({
        chapterCount: 0,
        entityCount: 0,
        outlineCount: 0
      })
    ).toMatchObject({
      title: "先补关键人物",
      description: "先把主角、对手和关键关系补齐，后面写章节才不容易空转。",
      href: "/world",
      actionLabel: "去补人物"
    });
  });

  it("recommends building an outline when entities exist but outlines do not", () => {
    expect(
      getRecommendedNextStep({
        chapterCount: 0,
        entityCount: 3,
        outlineCount: 0
      })
    ).toMatchObject({
      title: "先整理前几章结构",
      description: "人物已经有了，先把开头几章的大致走向排出来，再开始写会更顺。",
      href: "/outline",
      actionLabel: "去整理大纲"
    });
  });

  it("recommends starting the first chapter when entities and outlines are ready", () => {
    expect(
      getRecommendedNextStep({
        chapterCount: 0,
        entityCount: 3,
        outlineCount: 5
      })
    ).toMatchObject({
      title: "开始第一章",
      description: "人物和结构都已经打底，现在最值得先推进的是把第一章写出来。",
      href: "/write",
      actionLabel: "去写第一章"
    });
  });

  it("recommends continuing with the next chapter when foundational content exists", () => {
    expect(
      getRecommendedNextStep({
        chapterCount: 4,
        entityCount: 6,
        outlineCount: 8,
        firstChapterSlug: "cold-rain"
      })
    ).toMatchObject({
      title: "继续推进下一章",
      description: "基础内容已经齐了，直接接着推进下一章，最能保持这本书的写作惯性。",
      href: "/chapters/cold-rain",
      actionLabel: "去继续写"
    });
  });

  it("falls back to the outline when chapter data exists but no chapter slug is available", () => {
    expect(
      getRecommendedNextStep({
        chapterCount: 2,
        entityCount: 6,
        outlineCount: 8
      })
    ).toMatchObject({
      href: "/outline",
      actionLabel: "去继续写"
    });
  });
});
