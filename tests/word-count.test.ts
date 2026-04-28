import { describe, expect, it } from "vitest";
import { excerpt, estimateWordCount } from "@/lib/text/word-count";

describe("estimateWordCount", () => {
  it("counts Chinese characters and latin words together", () => {
    expect(estimateWordCount("沈砚看了一眼 harbor light")).toBe(8);
  });

  it("creates short excerpts without breaking short content", () => {
    expect(excerpt("这是一句短句。", 20)).toBe("这是一句短句。");
  });
});
