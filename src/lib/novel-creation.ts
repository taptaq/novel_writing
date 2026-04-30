import { z } from "zod";
import { novelStyleSampleSchema } from "@/lib/novel-style";
import { novelLengthOptions } from "@/lib/novel-length";
import type {
  CharacterSeedInput,
  GraphEntitySeedInput,
  GraphEntityKind,
  GraphRelationKind,
  NovelCreationInput,
  RelationSeedInput
} from "@/types/domain";

type SeedEntity = {
  type: GraphEntityKind;
  name: string;
  summary?: string;
  profile: {
    role?: string;
  };
};

type GraphSeed = {
  entities: SeedEntity[];
  relations: RelationSeedInput[];
};

type GraphSeedInput = Pick<
  NovelCreationInput,
  "characterSeeds" | "factionSeeds" | "locationSeeds" | "relationSeeds"
>;

const characterSeedSchema = z.object({
  name: z.string().trim().min(1, "人物姓名不能为空"),
  role: z.string().trim().optional().default(""),
  summary: z.string().trim().optional().default(""),
  factionName: z.string().trim().optional().default(""),
  locationName: z.string().trim().optional().default("")
});

const relationKinds = [
  "ALLY",
  "ENEMY",
  "FAMILY",
  "MENTOR",
  "SUBORDINATE",
  "OTHER",
  "MEMBER_OF",
  "ROOTED_IN"
] as const satisfies readonly GraphRelationKind[];
const novelLengthCategories = novelLengthOptions.map((option) => option.value) as [
  "SHORT",
  "MEDIUM",
  "LONG"
];

const relationSeedSchema = z.object({
  sourceName: z.string().trim().min(1),
  targetName: z.string().trim().min(1),
  type: z.enum(relationKinds),
  description: z.string().trim().optional().default(""),
  remark: z.string().trim().optional().default(""),
  note: z.string().trim().optional().default("")
});

const graphEntitySeedSchema = z.object({
  name: z.string().trim().min(1, "图谱实体名称不能为空"),
  summary: z.string().trim().optional().default("")
});

function collectEntityNames(
  characterSeeds: CharacterSeedInput[],
  factionSeeds: GraphEntitySeedInput[],
  locationSeeds: GraphEntitySeedInput[]
) {
  return [
    ...characterSeeds.flatMap((item) => {
      const entries: { type: GraphEntityKind; name: string | undefined }[] = [
        { type: "CHARACTER", name: normalizeOptionalText(item.name) }
      ];
      const factionName = normalizeOptionalText(item.factionName);
      const locationName = normalizeOptionalText(item.locationName);

      if (factionName) {
        entries.push({ type: "FACTION", name: factionName });
      }

      if (locationName) {
        entries.push({ type: "LOCATION", name: locationName });
      }

      return entries;
    }),
    ...factionSeeds.map((item) => ({
      type: "FACTION" as const,
      name: normalizeOptionalText(item.name)
    })),
    ...locationSeeds.map((item) => ({
      type: "LOCATION" as const,
      name: normalizeOptionalText(item.name)
    }))
  ];
}

function normalizeGraphEntitySeed(seed?: Partial<GraphEntitySeedInput>) {
  return {
    name: normalizeOptionalText(seed?.name) ?? "",
    summary: normalizeOptionalText(seed?.summary)
  };
}

function createExplicitEntities(seeds: GraphEntitySeedInput[], type: GraphEntityKind) {
  return uniqueBy(
    seeds
      .map((item) => normalizeGraphEntitySeed(item))
      .filter((item) => item.name)
      .map((item) => ({
        type,
        name: item.name,
        summary: item.summary,
        profile: {}
      })),
    (item) => `${item.type}:${item.name}`
  );
}

export const novelCreationSchema = z
  .object({
    title: z.string().trim().min(1, "书名不能为空"),
    category: z.string().trim().min(1, "类型不能为空"),
    subGenre: z.string().trim().min(1, "细分类型不能为空"),
    targetAudience: z.string().trim().min(1, "目标受众不能为空"),
    premise: z.string().trim().min(1, "一句话 premise 不能为空"),
    narrativeView: z.string().trim().min(1, "叙事视角不能为空"),
    storyStructure: z.string().trim().min(1, "故事结构不能为空"),
    lengthCategory: z.enum(novelLengthCategories).default("MEDIUM"),
    plannedChapterCount: z.number().int().positive().optional(),
    targetWordsPerChapter: z.number().int().positive().optional(),
    worldSeed: z.string().trim().optional().default(""),
    styleGoal: z.string().trim().optional().default(""),
    styleSamples: z.array(novelStyleSampleSchema).max(3).default([]),
    factionSeeds: z.array(graphEntitySeedSchema).default([]),
    locationSeeds: z.array(graphEntitySeedSchema).default([]),
    characterSeeds: z.array(characterSeedSchema).default([]),
    relationSeeds: z.array(relationSeedSchema).default([])
  })
  .superRefine((input, ctx) => {
    const characterNameCounts = new Map<string, number>();

    input.characterSeeds.forEach((item, index) => {
      const name = normalizeOptionalText(item.name);
      if (!name) {
        return;
      }

      const currentCount = characterNameCounts.get(name) ?? 0;
      characterNameCounts.set(name, currentCount + 1);

      if (currentCount > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["characterSeeds", index, "name"],
          message: "人物姓名不能重复"
        });
      }
    });

    const seenGraphNames = new Map<string, Set<GraphEntityKind>>();

    collectEntityNames(input.characterSeeds, input.factionSeeds, input.locationSeeds).forEach((item) => {
      if (!item.name) {
        return;
      }

      const existingTypes = seenGraphNames.get(item.name);
      if (existingTypes && !existingTypes.has(item.type)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["characterSeeds"],
          message: `图谱实体名称不能重复：${item.name}`
        });
        return;
      }

      if (existingTypes) {
        existingTypes.add(item.type);
        return;
      }

      seenGraphNames.set(item.name, new Set([item.type]));
    });
  });

function uniqueBy<T>(items: T[], keyFn: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function isRelationCompatible(
  relation: Pick<RelationSeedInput, "sourceName" | "targetName" | "type">,
  survivingEntityKinds: Map<string, GraphEntityKind>
) {
  const sourceKind = survivingEntityKinds.get(relation.sourceName);
  const targetKind = survivingEntityKinds.get(relation.targetName);

  if (!sourceKind || !targetKind) {
    return false;
  }

  if (relation.type === "MEMBER_OF") {
    return sourceKind === "CHARACTER" && targetKind === "FACTION";
  }

  if (relation.type === "ROOTED_IN") {
    return sourceKind === "CHARACTER" && targetKind === "LOCATION";
  }

  return true;
}

function createScopedEntities(
  characterSeeds: CharacterSeedInput[],
  key: "factionName" | "locationName",
  type: GraphEntityKind
) {
  return uniqueBy(
    characterSeeds
      .map((item) => normalizeOptionalText(item[key]))
      .filter((item): item is string => Boolean(item))
      .map((name) => ({
        type,
        name,
        summary: undefined,
        profile: {}
      })),
    (item) => `${item.type}:${item.name}`
  );
}

export function buildInitialGraphSeed(input: GraphSeedInput): GraphSeed {
  const normalizedCharacterSeeds = input.characterSeeds
    .map((item) => ({
      name: normalizeOptionalText(item.name) ?? "",
      role: normalizeOptionalText(item.role),
      summary: normalizeOptionalText(item.summary),
      factionName: normalizeOptionalText(item.factionName),
      locationName: normalizeOptionalText(item.locationName)
    }))
    .filter((item) => item.name);

  const uniqueCharacterSeeds = uniqueBy(normalizedCharacterSeeds, (item) => item.name);

  const characterEntities: SeedEntity[] = uniqueCharacterSeeds.map((item) => ({
    type: "CHARACTER",
    name: item.name,
    summary: item.summary ?? item.role,
    profile: {
      role: item.role
    }
  }));

  const survivingEntityKinds = new Map<string, GraphEntityKind>();
  characterEntities.forEach((item) => {
    survivingEntityKinds.set(item.name, item.type);
  });

  const explicitFactionEntities = createExplicitEntities(input.factionSeeds ?? [], "FACTION");
  const derivedFactionEntities = createScopedEntities(uniqueCharacterSeeds, "factionName", "FACTION");
  const factionEntities = uniqueBy(
    [...explicitFactionEntities, ...derivedFactionEntities],
    (item) => `${item.type}:${item.name}`
  ).filter((item) => {
    const existingKind = survivingEntityKinds.get(item.name);
    if (existingKind && existingKind !== item.type) {
      return false;
    }

    survivingEntityKinds.set(item.name, item.type);
    return true;
  });

  const explicitLocationEntities = createExplicitEntities(input.locationSeeds ?? [], "LOCATION");
  const derivedLocationEntities = createScopedEntities(
    uniqueCharacterSeeds,
    "locationName",
    "LOCATION"
  );
  const locationEntities = uniqueBy(
    [...explicitLocationEntities, ...derivedLocationEntities],
    (item) => `${item.type}:${item.name}`
  ).filter((item) => {
    const existingKind = survivingEntityKinds.get(item.name);
    if (existingKind && existingKind !== item.type) {
      return false;
    }

    survivingEntityKinds.set(item.name, item.type);
    return true;
  });

  const entityNames = new Set(survivingEntityKinds.keys());

  const explicitRelations = input.relationSeeds
    .map((item) => ({
      sourceName: normalizeOptionalText(item.sourceName) ?? "",
      targetName: normalizeOptionalText(item.targetName) ?? "",
      type: item.type,
      description: normalizeOptionalText(item.description),
      remark: normalizeOptionalText(item.remark),
      note: normalizeOptionalText(item.note)
    }))
    .filter((item) => isRelationCompatible(item, survivingEntityKinds));

  const relations = [
    ...explicitRelations,
    ...uniqueCharacterSeeds.flatMap((item): RelationSeedInput[] => {
      const scopedRelations: RelationSeedInput[] = [];
      const factionName = item.factionName;
      const locationName = item.locationName;

      if (
        factionName &&
        entityNames.has(item.name) &&
        survivingEntityKinds.get(factionName) === "FACTION"
      ) {
        scopedRelations.push({
          sourceName: item.name,
          targetName: factionName,
          type: "MEMBER_OF",
          description: `${item.name} 隶属于 ${factionName}`
        });
      }

      if (
        locationName &&
        entityNames.has(item.name) &&
        survivingEntityKinds.get(locationName) === "LOCATION"
      ) {
        scopedRelations.push({
          sourceName: item.name,
          targetName: locationName,
          type: "ROOTED_IN",
          description: `${item.name} 与 ${locationName} 有核心联系`
        });
      }

      return scopedRelations;
    })
  ];

  return {
    entities: [...characterEntities, ...factionEntities, ...locationEntities],
    relations
  };
}

export function buildNovelCreationInput(raw: unknown) {
  const input = novelCreationSchema.parse(raw) as NovelCreationInput;
  const graph = buildInitialGraphSeed(input);

  return {
    novel: {
      title: input.title,
      premise: input.premise,
      summary: input.premise,
      category: input.category,
      subGenre: input.subGenre,
      targetAudience: input.targetAudience,
      narrativeView: input.narrativeView,
      storyStructure: input.storyStructure,
      lengthCategory: input.lengthCategory,
      plannedChapterCount: input.plannedChapterCount,
      targetWordsPerChapter: input.targetWordsPerChapter,
      worldSeed: normalizeOptionalText(input.worldSeed),
      styleGoal: normalizeOptionalText(input.styleGoal),
      styleSamples: input.styleSamples.map((sample) => ({
        title: sample.title?.trim() || undefined,
        content: sample.content.trim(),
        note: sample.note?.trim() || undefined
      })),
      factionSeeds: input.factionSeeds.map((item) => ({
        name: item.name.trim(),
        summary: item.summary?.trim() || undefined
      })),
      locationSeeds: input.locationSeeds.map((item) => ({
        name: item.name.trim(),
        summary: item.summary?.trim() || undefined
      }))
    },
    graph
  };
}
