import { z } from "zod";
import type { NovelStyleProfileSummary } from "@/types/domain";

export type NovelStyleRepositoryErrorCode = "DATABASE_NOT_CONFIGURED" | "NOVEL_NOT_FOUND";

export class NovelStyleRepositoryError extends Error {
  code: NovelStyleRepositoryErrorCode;

  constructor(code: NovelStyleRepositoryErrorCode, cause?: unknown) {
    super(code);
    this.name = "NovelStyleRepositoryError";
    this.code = code;

    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export function isNovelStyleRepositoryError(
  error: unknown
): error is NovelStyleRepositoryError {
  return error instanceof NovelStyleRepositoryError;
}

export function cleanLines(items: unknown): string[] {
  return Array.isArray(items)
    ? items
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export const novelStyleSampleSchema = z.object({
  title: z.string().trim().optional(),
  content: z.string().trim().min(20, "参考样文至少需要 20 个字符"),
  note: z.string().trim().optional()
});

export const novelStyleProfileSchema = z.object({
  id: z.string().trim().optional(),
  styleSummary: z.string().trim().optional().default(""),
  styleRules: z.array(z.string()).default([]),
  avoidRules: z.array(z.string()).default([]),
  dialogueRules: z.array(z.string()).default([]),
  narrationRules: z.array(z.string()).default([]),
  rhythmRules: z.array(z.string()).default([]),
  imageryRules: z.array(z.string()).default([]),
  status: z.enum(["EMPTY", "READY", "FAILED"]).default("EMPTY"),
  lastGeneratedAt: z.string().trim().optional()
});

export function normalizeStyleProfile(input: unknown): NovelStyleProfileSummary {
  const parsed = novelStyleProfileSchema.parse(input ?? {});

  return {
    id: parsed.id || undefined,
    styleSummary: parsed.styleSummary || undefined,
    styleRules: cleanLines(parsed.styleRules),
    avoidRules: cleanLines(parsed.avoidRules),
    dialogueRules: cleanLines(parsed.dialogueRules),
    narrationRules: cleanLines(parsed.narrationRules),
    rhythmRules: cleanLines(parsed.rhythmRules),
    imageryRules: cleanLines(parsed.imageryRules),
    status: parsed.status,
    lastGeneratedAt: parsed.lastGeneratedAt || undefined
  };
}

export function buildStyleRebuildFallback(samples: string[]) {
  return normalizeStyleProfile({
    styleSummary:
      samples.length > 0 ? "当前已有参考样文，建议手动补充规则后再用于稳定续写。" : "",
    styleRules: [],
    avoidRules: [],
    dialogueRules: [],
    narrationRules: [],
    rhythmRules: [],
    imageryRules: [],
    status: samples.length > 0 ? "FAILED" : "EMPTY"
  });
}

export function buildEffectiveStyleContext(
  profile: NovelStyleProfileSummary | undefined,
  disabled: boolean
) {
  if (disabled || !profile || profile.status !== "READY") {
    return { enabled: false, profile: undefined };
  }

  return { enabled: true, profile };
}
