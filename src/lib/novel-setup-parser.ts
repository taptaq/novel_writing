import { z } from "zod";
import { novelLengthOptions } from "@/lib/novel-length";
import { novelStyleSampleSchema } from "@/lib/novel-style";
import type { ParsedSetupDraft } from "@/types/domain";

const novelLengthCategories = novelLengthOptions.map((option) => option.value) as [
  "SHORT",
  "MEDIUM",
  "LONG"
];

const parsedSetupCharacterSeedSchema = z.object({
  name: z.string().trim().min(1, "人物姓名不能为空"),
  role: z.string().trim().optional().default(""),
  summary: z.string().trim().optional().default(""),
  factionName: z.string().trim().optional().default(""),
  locationName: z.string().trim().optional().default("")
});

const parsedSetupGraphEntitySeedSchema = z.object({
  name: z.string().trim().min(1, "图谱实体名称不能为空"),
  summary: z.string().trim().optional().default("")
});

const parsedSetupRelationKinds = [
  "ALLY",
  "ENEMY",
  "FAMILY",
  "MENTOR",
  "SUBORDINATE",
  "OTHER",
  "MEMBER_OF",
  "ROOTED_IN"
] as const;

const parsedSetupRelationSeedSchema = z.object({
  sourceName: z.string().trim().min(1, "关系起点不能为空"),
  targetName: z.string().trim().min(1, "关系终点不能为空"),
  type: z.enum(parsedSetupRelationKinds),
  description: z.string().trim().optional().default(""),
  remark: z.string().trim().optional().default(""),
  note: z.string().trim().optional().default("")
});

export const parsedSetupDraftSchema = z.object({
  title: z.string().trim().optional().default(""),
  category: z.string().trim().optional().default(""),
  subGenre: z.string().trim().optional().default(""),
  targetAudience: z.string().trim().optional().default(""),
  premise: z.string().trim().optional().default(""),
  narrativeView: z.string().trim().optional().default(""),
  storyStructure: z.string().trim().optional().default(""),
  lengthCategory: z.enum(novelLengthCategories).default("MEDIUM"),
  plannedChapterCount: z.number().int().positive().optional(),
  targetWordsPerChapter: z.number().int().positive().optional(),
  worldSeed: z.string().trim().optional().default(""),
  styleGoal: z.string().trim().optional().default(""),
  styleSamples: z.array(novelStyleSampleSchema).max(3).default([]),
  factionSeeds: z.array(parsedSetupGraphEntitySeedSchema).default([]),
  locationSeeds: z.array(parsedSetupGraphEntitySeedSchema).default([]),
  characterSeeds: z.array(parsedSetupCharacterSeedSchema).default([]),
  relationSeeds: z.array(parsedSetupRelationSeedSchema).default([]),
  guessedFields: z.array(z.string().trim()).default([]),
  missingFields: z.array(z.string().trim()).default([]),
  confidenceNotes: z.array(z.string().trim()).default([])
});

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function normalizePositiveInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    return parsed > 0 ? parsed : undefined;
  }

  return undefined;
}

function normalizeValidatedArray<T>(
  value: unknown,
  parseItem: (item: unknown) => T | undefined,
  maxItems?: number
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const validItems = value.flatMap((item) => {
    const parsed = parseItem(item);
    return parsed === undefined ? [] : [parsed];
  });

  return typeof maxItems === "number" ? validItems.slice(0, maxItems) : validItems;
}

function normalizeStyleSamples(value: unknown) {
  return normalizeValidatedArray(value, (item) => {
    const parsed = novelStyleSampleSchema.safeParse(item);
    return parsed.success ? parsed.data : undefined;
  }, 3);
}

function normalizeGraphEntitySeeds(value: unknown) {
  return normalizeValidatedArray(value, (item) => {
    const parsed = parsedSetupGraphEntitySeedSchema.safeParse(item);
    return parsed.success ? parsed.data : undefined;
  });
}

function normalizeCharacterSeeds(value: unknown) {
  return normalizeValidatedArray(value, (item) => {
    const parsed = parsedSetupCharacterSeedSchema.safeParse(item);
    return parsed.success ? parsed.data : undefined;
  });
}

function normalizeRelationSeeds(value: unknown) {
  return normalizeValidatedArray(value, (item) => {
    const parsed = parsedSetupRelationSeedSchema.safeParse(item);
    return parsed.success ? parsed.data : undefined;
  });
}

export function normalizeParsedSetupDraft(input: unknown): ParsedSetupDraft {
  const source = typeof input === "object" && input !== null ? input : {};
  const value = source as Record<string, unknown>;
  const lengthCategory = novelLengthCategories.includes(value.lengthCategory as never)
    ? (value.lengthCategory as (typeof novelLengthCategories)[number])
    : "MEDIUM";

  return parsedSetupDraftSchema.parse({
    title: normalizeString(value.title),
    category: normalizeString(value.category),
    subGenre: normalizeString(value.subGenre),
    targetAudience: normalizeString(value.targetAudience),
    premise: normalizeString(value.premise),
    narrativeView: normalizeString(value.narrativeView),
    storyStructure: normalizeString(value.storyStructure),
    lengthCategory,
    plannedChapterCount: normalizePositiveInteger(value.plannedChapterCount),
    targetWordsPerChapter: normalizePositiveInteger(value.targetWordsPerChapter),
    worldSeed: normalizeString(value.worldSeed),
    styleGoal: normalizeString(value.styleGoal),
    styleSamples: normalizeStyleSamples(value.styleSamples),
    factionSeeds: normalizeGraphEntitySeeds(value.factionSeeds),
    locationSeeds: normalizeGraphEntitySeeds(value.locationSeeds),
    characterSeeds: normalizeCharacterSeeds(value.characterSeeds),
    relationSeeds: normalizeRelationSeeds(value.relationSeeds),
    guessedFields: normalizeStringArray(value.guessedFields),
    missingFields: normalizeStringArray(value.missingFields),
    confidenceNotes: normalizeStringArray(value.confidenceNotes)
  });
}
