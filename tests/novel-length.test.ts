import { describe, expect, it } from "vitest";
import {
  getLengthFeatureHints,
  getNovelLengthProfile,
  novelLengthOptions
} from "@/lib/novel-length";

describe("novel length profiles", () => {
  it("defines short, medium, and long form options", () => {
    expect(novelLengthOptions.map((option) => option.value)).toEqual(["SHORT", "MEDIUM", "LONG"]);
  });

  it("uses focused defaults for short fiction", () => {
    const profile = getNovelLengthProfile("SHORT");

    expect(profile.defaultChapterCount).toBe(6);
    expect(profile.defaultWordsPerChapter).toBe(2500);
    expect(profile.moduleMode.graph).toBe("轻量");
    expect(profile.moduleMode.foreshadow).toBe("少量精准");
  });

  it("uses layered module guidance for long fiction", () => {
    const hints = getLengthFeatureHints("LONG");

    expect(hints).toContain("建议开启分卷规划，先确定卷目标和阶段性高潮。");
    expect(hints).toContain("人物图谱建议维护势力、地点和关键关系变化。");
    expect(hints).toContain("资料检索与设定卡建议持续沉淀，避免长篇后期设定漂移。");
  });
});
