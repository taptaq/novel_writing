import { describe, expect, it, vi } from "vitest";
import { buildGraphExportFilename, getGraphExportLabel } from "@/lib/graph-export";

describe("graph-export", () => {
  it("builds a png filename with slug, scope, and date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-27T08:30:00.000Z"));

    expect(buildGraphExportFilename("glass-citadel", "characters")).toBe(
      "glass-citadel-characters-2026-04-27.png"
    );

    vi.useRealTimers();
  });

  it("builds a readable export label", () => {
    expect(
      getGraphExportLabel("玻璃城遗闻", "characters-factions", new Date("2026-04-27T08:30:00.000Z"))
    ).toBe("玻璃城遗闻 · 人物 + 势力 · 2026-04-27");
  });

  it("builds a readable export label for the full graph scope", () => {
    expect(
      getGraphExportLabel("玻璃城遗闻", "all", new Date("2026-04-27T08:30:00.000Z"))
    ).toBe("玻璃城遗闻 · 人物 + 势力 + 地点 · 2026-04-27");
  });
});
