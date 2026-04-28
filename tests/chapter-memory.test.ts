import { describe, expect, it } from "vitest";
import { buildChapterMemory } from "@/lib/chapter-memory";

describe("buildChapterMemory", () => {
  it("builds a compact memory from previous chapters and active threads", () => {
    const memory = buildChapterMemory({
      currentChapter: {
        slug: "chapter-3",
        title: "第三声钟响前",
        order: 3,
        sceneGoal: "让主角意识到危险"
      },
      chapters: [
        {
          slug: "chapter-1",
          title: "潮湿来信",
          order: 1,
          summary: "沈砚收到匿名来信，发现潮汐钟提前响了一次。"
        },
        {
          slug: "chapter-2",
          title: "旧港图",
          order: 2,
          excerpt: "老齐把旧港图摊开，指向废栈桥旁边那个被水渍吃掉的印记。"
        },
        {
          slug: "chapter-3",
          title: "第三声钟响前",
          order: 3,
          summary: "当前章节"
        }
      ],
      outlines: [
        {
          id: "outline-1",
          title: "主线：潮汐钟失准",
          summary: "钟声失准会影响整座港城的记忆。",
          depth: 0,
          order: 1,
          status: "OPEN"
        }
      ],
      foreshadows: [
        {
          id: "hook-1",
          hook: "匿名来信",
          plannedPayoff: "信的真正收件人不是沈砚。",
          status: "OPEN",
          firstMentionChapterSlug: "chapter-1"
        }
      ],
      entities: [
        {
          id: "entity-1",
          type: "CHARACTER",
          name: "沈砚",
          summary: "守钟人学徒",
          tags: []
        }
      ]
    });

    expect(memory.previousChapterCount).toBe(2);
    expect(memory.storySoFar).toContain("第1章《潮湿来信》：沈砚收到匿名来信，发现潮汐钟提前响了一次。");
    expect(memory.storySoFar[1]).toContain("第2章《旧港图》");
    expect(memory.activeStoryLines).toContain("主线：潮汐钟失准：钟声失准会影响整座港城的记忆。");
    expect(memory.openThreads).toContain("匿名来信 -> 信的真正收件人不是沈砚。");
    expect(memory.keyEntities).toContain("沈砚：守钟人学徒");
    expect(memory.currentFocus).toBe("让主角意识到危险");
  });
});
