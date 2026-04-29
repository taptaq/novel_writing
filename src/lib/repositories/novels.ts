import type { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import {
  getDemoChapterEditor,
  getDemoGraphData,
  getDemoNovelSummaries,
  getDemoWorkspace
} from "@/lib/demo-data";
import { isDatabaseConfigured } from "@/lib/env";
import { buildNovelCreationInput } from "@/lib/novel-creation";
import {
  buildStyleRebuildFallback,
  NovelStyleRepositoryError,
  normalizeStyleProfile,
  novelStyleProfileSchema,
  novelStyleSampleSchema
} from "@/lib/novel-style";
import { buildChapterMemory } from "@/lib/chapter-memory";
import { prisma } from "@/lib/prisma";
import { estimateWordCount, excerpt } from "@/lib/text/word-count";
import type {
  ChapterEditorData,
  ChapterVersionSummary,
  GraphEntityKind,
  GraphRelationKind,
  NovelGraphData,
  NovelStyleProfileSummary,
  NovelStyleSampleSummary,
  NovelStyleWorkspace,
  NovelSummary,
  NovelWorkspace
} from "@/types/domain";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type PrismaEntityType = "CHARACTER" | "LOCATION" | "FACTION" | "ITEM" | "RULE" | "EVENT";
type PrismaRelationType = "ALLY" | "ENEMY" | "FAMILY" | "MENTOR" | "SUBORDINATE" | "OTHER";

type WordCountChapterRow = {
  wordCount: number;
};

type NovelSummaryRow = {
  id: string;
  slug: string;
  title: string;
  premise: string | null;
  summary: string | null;
  genre: string | null;
  tone: string | null;
  lengthCategory: NovelSummary["lengthCategory"] | null;
  status: NovelSummary["status"];
  updatedAt: Date;
  chapters: WordCountChapterRow[];
};

type WorkspaceChapterRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  sceneGoal: string | null;
  plainText: string;
  order: number;
  status: "DRAFT" | "REVIEW" | "READY" | "PUBLISHED";
  wordCount: number;
  updatedAt: Date;
};

type ChapterEditorVersionRow = {
  id: string;
  source: string;
  note: string | null;
  plainText: string;
  createdAt: Date;
};

type ChapterEditorChapterRow = WorkspaceChapterRow & {
  versions: ChapterEditorVersionRow[];
};

type WorkspaceEntityRow = {
  id: string;
  type: PrismaEntityType;
  name: string;
  summary: string | null;
  tags: string[];
};

type WorkspaceOutlineRow = {
  id: string;
  title: string;
  summary: string | null;
  depth: number;
  order: number;
  status: string;
  chapter: { slug: string } | null;
};

type WorkspaceForeshadowRow = {
  id: string;
  hook: string;
  plannedPayoff: string | null;
  status: string;
  firstMentionChapter: { slug: string } | null;
  payoffChapter: { slug: string } | null;
};

type WorkspaceNovelRow = Omit<NovelSummaryRow, "chapters"> & {
  voiceRules: JsonValue | null;
  chapters: WorkspaceChapterRow[];
  entities: WorkspaceEntityRow[];
  outlines: WorkspaceOutlineRow[];
  foreshadows: WorkspaceForeshadowRow[];
};

type GraphRelationRow = {
  id: string;
  sourceId: string;
  targetId: string;
  type: PrismaRelationType;
  description: string | null;
  remark: string | null;
  note: string | null;
};

type GraphEntityRow = WorkspaceEntityRow & {
  sourceRelations: GraphRelationRow[];
};

type GraphNovelRow = Omit<NovelSummaryRow, "chapters"> & {
  chapters: WordCountChapterRow[];
  entities: GraphEntityRow[];
};

type StyleProfileRow = {
  id: string;
  styleSummary: string | null;
  styleRules: JsonValue | null;
  avoidRules: JsonValue | null;
  dialogueRules: JsonValue | null;
  narrationRules: JsonValue | null;
  rhythmRules: JsonValue | null;
  imageryRules: JsonValue | null;
  status: "EMPTY" | "READY" | "FAILED";
  lastGeneratedAt: Date | null;
};

type StyleSampleRow = {
  id: string;
  title: string | null;
  sourceType: "USER_SAMPLE" | "EXISTING_CHAPTER" | "MANUAL_PASTE";
  content: string;
  note: string | null;
  isActive: boolean;
  createdAt: Date;
};

type StyleWorkspaceNovelRow = Omit<NovelSummaryRow, "chapters"> & {
  chapters: WordCountChapterRow[];
  styleProfile: StyleProfileRow | null;
  styleSamples: StyleSampleRow[];
};

type ChapterEditorNovelRow = Omit<WorkspaceNovelRow, "styleProfile" | "chapters"> & {
  styleProfile: StyleProfileRow | null;
  chapters: ChapterEditorChapterRow[];
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function slugifySegment(value: string) {
  const slug = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "novel";
}

async function createUniqueNovelSlug(
  title: string,
  findBySlug: (slug: string) => Promise<{ id: string } | null>
) {
  const baseSlug = slugifySegment(title);
  let candidate = baseSlug;
  let counter = 2;

  while (await findBySlug(candidate)) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return candidate;
}

async function createUniqueChapterSlug(
  baseSlug: string,
  findBySlug: (slug: string) => Promise<{ id: string } | null>
) {
  let candidate = baseSlug;
  let counter = 2;

  while (await findBySlug(candidate)) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function mapEntityType(type: GraphEntityKind): PrismaEntityType {
  return type;
}

function isGraphEntity<T extends { type: string }>(entity: T): entity is T & { type: GraphEntityKind } {
  return entity.type === "CHARACTER" || entity.type === "FACTION" || entity.type === "LOCATION";
}

function mapRelationType(type: GraphRelationKind): PrismaRelationType {
  if (type === "MEMBER_OF" || type === "ROOTED_IN") {
    return "OTHER";
  }

  return type;
}

function toNovelSummaryRecord(novel: {
  id: string;
  slug: string;
  title: string;
  premise: string | null;
  summary: string | null;
  genre: string | null;
  tone: string | null;
  lengthCategory: NovelSummary["lengthCategory"] | null;
  status: NovelSummary["status"];
  updatedAt: Date;
}) {
  return {
    id: novel.id,
    slug: novel.slug,
    title: novel.title,
    premise: novel.premise ?? undefined,
    summary: novel.summary ?? undefined,
    genre: novel.genre ?? undefined,
    tone: novel.tone ?? undefined,
    lengthCategory: novel.lengthCategory ?? "MEDIUM",
    status: novel.status,
    updatedAt: novel.updatedAt.toISOString(),
    chapterCount: 0,
    wordCount: 0
  } satisfies NovelSummary;
}

function toNovelStyleProfileSummary(profile: {
  id: string;
  styleSummary: string | null;
  styleRules: JsonValue | null;
  avoidRules: JsonValue | null;
  dialogueRules: JsonValue | null;
  narrationRules: JsonValue | null;
  rhythmRules: JsonValue | null;
  imageryRules: JsonValue | null;
  status: "EMPTY" | "READY" | "FAILED";
  lastGeneratedAt: Date | null;
}): NovelStyleProfileSummary {
  return normalizeStyleProfile({
    id: profile.id,
    styleSummary: profile.styleSummary ?? undefined,
    styleRules: profile.styleRules ?? undefined,
    avoidRules: profile.avoidRules ?? undefined,
    dialogueRules: profile.dialogueRules ?? undefined,
    narrationRules: profile.narrationRules ?? undefined,
    rhythmRules: profile.rhythmRules ?? undefined,
    imageryRules: profile.imageryRules ?? undefined,
    status: profile.status,
    lastGeneratedAt: profile.lastGeneratedAt?.toISOString()
  });
}

function toNovelStyleSampleSummary(sample: {
  id: string;
  title: string | null;
  sourceType: "USER_SAMPLE" | "EXISTING_CHAPTER" | "MANUAL_PASTE";
  content: string;
  note: string | null;
  isActive: boolean;
  createdAt: Date;
}): NovelStyleSampleSummary {
  return {
    id: sample.id,
    title: sample.title ?? undefined,
    sourceType: sample.sourceType,
    content: sample.content,
    note: sample.note ?? undefined,
    isActive: sample.isActive,
    createdAt: sample.createdAt.toISOString()
  };
}

function toStyleProfilePersistenceInput(input: NovelStyleProfileSummary) {
  return {
    styleSummary: input.styleSummary,
    styleRules: input.styleRules,
    avoidRules: input.avoidRules,
    dialogueRules: input.dialogueRules,
    narrationRules: input.narrationRules,
    rhythmRules: input.rhythmRules,
    imageryRules: input.imageryRules,
    status: input.status,
    lastGeneratedAt: input.lastGeneratedAt ? new Date(input.lastGeneratedAt) : null
  };
}

function toParagraphBlocks(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph, index) => ({
      id: `block-${index + 1}`,
      type: "paragraph",
      text: paragraph.trim()
    }))
    .filter((item) => item.text.length > 0);
}

export type NovelSummariesResult = {
  novels: NovelSummary[];
  source: "database" | "demo";
};

export type ChapterRepositoryErrorCode =
  | "DATABASE_NOT_CONFIGURED"
  | "NOVEL_NOT_FOUND"
  | "CHAPTER_NOT_FOUND"
  | "STALE_CHAPTER_DRAFT";

export class ChapterRepositoryError extends Error {
  code: ChapterRepositoryErrorCode;

  constructor(code: ChapterRepositoryErrorCode) {
    super(code);
    this.name = "ChapterRepositoryError";
    this.code = code;
  }
}

export function isChapterRepositoryError(
  error: unknown
): error is ChapterRepositoryError {
  return error instanceof ChapterRepositoryError;
}

function getDemoNovelSummariesResult(): NovelSummariesResult {
  return {
    novels: getDemoNovelSummaries(),
    source: "demo"
  };
}

export async function getNovelSummariesWithSource(): Promise<NovelSummariesResult> {
  if (!isDatabaseConfigured) {
    return getDemoNovelSummariesResult();
  }

  try {
    const novels = (await prisma.novel.findMany({
      include: {
        chapters: {
          select: {
            wordCount: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    })) as NovelSummaryRow[];

    if (novels.length === 0) {
      return getDemoNovelSummariesResult();
    }

    return {
      novels: novels.map((novel) => ({
        id: novel.id,
        slug: novel.slug,
        title: novel.title,
        premise: novel.premise ?? undefined,
        summary: novel.summary ?? undefined,
        genre: novel.genre ?? undefined,
        tone: novel.tone ?? undefined,
        lengthCategory: novel.lengthCategory ?? "MEDIUM",
        status: novel.status,
        updatedAt: novel.updatedAt.toISOString(),
        chapterCount: novel.chapters.length,
        wordCount: novel.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0)
      })),
      source: "database"
    };
  } catch {
    return getDemoNovelSummariesResult();
  }
}

export async function getNovelSummaries(): Promise<NovelSummary[]> {
  return (await getNovelSummariesWithSource()).novels;
}

export async function createNovelWithSeedData(raw: unknown): Promise<NovelSummary> {
  if (!isDatabaseConfigured) {
    throw new Error("Database is not configured.");
  }

  const input = buildNovelCreationInput(raw);
  const genre = [input.novel.category, input.novel.subGenre].filter(Boolean).join(" / ") || undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const createdNovel = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const slug = await createUniqueNovelSlug(
          input.novel.title,
          async (candidate) =>
            tx.novel.findUnique({
              where: { slug: candidate },
              select: { id: true }
            })
        );

        const novel = await tx.novel.create({
          data: {
            slug,
            title: input.novel.title,
            premise: input.novel.premise,
            summary: input.novel.summary,
            genre,
            tone: input.novel.styleGoal,
            category: input.novel.category,
            lengthCategory: input.novel.lengthCategory,
            subGenre: input.novel.subGenre,
            targetAudience: input.novel.targetAudience,
            narrativeView: input.novel.narrativeView,
            storyStructure: input.novel.storyStructure,
            plannedChapterCount: input.novel.plannedChapterCount,
            targetWordsPerChapter: input.novel.targetWordsPerChapter,
            styleGoal: input.novel.styleGoal,
            worldSeed: input.novel.worldSeed
          }
        });

        if (input.novel.styleSamples.length > 0) {
          await tx.novelStyleProfile.create({
            data: {
              novelId: novel.id,
              status: "EMPTY"
            }
          });

          await tx.novelStyleSample.createMany({
            data: input.novel.styleSamples.map((sample) => ({
              novelId: novel.id,
              title: sample.title,
              sourceType: "USER_SAMPLE",
              content: sample.content,
              note: sample.note
            }))
          });
        }

        const entityIdByName = new Map<string, string>();

        for (const entity of input.graph.entities) {
          const createdEntity = await tx.storyEntity.create({
            data: {
              novelId: novel.id,
              type: mapEntityType(entity.type),
              name: entity.name,
              aliases: [],
              summary: entity.summary,
              tags: [],
              profile: entity.profile
            }
          });

          entityIdByName.set(entity.name, createdEntity.id);
        }

        for (const relation of input.graph.relations) {
          const sourceId = entityIdByName.get(relation.sourceName);
          const targetId = entityIdByName.get(relation.targetName);

          if (!sourceId || !targetId) {
            continue;
          }

          await tx.entityRelation.create({
            data: {
              sourceId,
              targetId,
              type: mapRelationType(relation.type),
              description: relation.description?.trim() || undefined,
              remark: relation.remark?.trim() || undefined,
              note: relation.note?.trim() || undefined
            }
          });
        }

        return novel;
      });

      return toNovelSummaryRecord(createdNovel);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Novel slug conflict.");
}

export async function getNovelWorkspace(novelSlug: string): Promise<NovelWorkspace | null> {
  if (!isDatabaseConfigured) {
    return getDemoWorkspace(novelSlug);
  }

  try {
    const novel = (await prisma.novel.findUnique({
      where: {
        slug: novelSlug
      },
      include: {
        chapters: {
          orderBy: {
            order: "asc"
          }
        },
        entities: {
          orderBy: {
            updatedAt: "desc"
          }
        },
        outlines: {
          include: {
            chapter: {
              select: {
                slug: true
              }
            }
          },
          orderBy: [
            {
              depth: "asc"
            },
            {
              order: "asc"
            }
          ]
        },
        foreshadows: {
          include: {
            firstMentionChapter: {
              select: {
                slug: true
              }
            },
            payoffChapter: {
              select: {
                slug: true
              }
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    })) as WorkspaceNovelRow | null;

    if (!novel) {
      return null;
    }

    return {
      novel: {
        id: novel.id,
        slug: novel.slug,
        title: novel.title,
        premise: novel.premise ?? undefined,
        summary: novel.summary ?? undefined,
        genre: novel.genre ?? undefined,
        tone: novel.tone ?? undefined,
        lengthCategory: novel.lengthCategory ?? "MEDIUM",
        status: novel.status,
        updatedAt: novel.updatedAt.toISOString(),
        chapterCount: novel.chapters.length,
        wordCount: novel.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0)
      },
      voiceRules: toStringArray(novel.voiceRules),
      chapters: novel.chapters.map((chapter) => ({
        id: chapter.id,
        slug: chapter.slug,
        title: chapter.title,
        summary: chapter.summary ?? undefined,
        sceneGoal: chapter.sceneGoal ?? undefined,
        order: chapter.order,
        status: chapter.status,
        wordCount: chapter.wordCount,
        excerpt: excerpt(chapter.plainText)
      })),
      entities: novel.entities.map((entity) => ({
        id: entity.id,
        type: entity.type,
        name: entity.name,
        summary: entity.summary ?? undefined,
        tags: entity.tags
      })),
      outlines: novel.outlines.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary ?? undefined,
        depth: item.depth,
        order: item.order,
        status: item.status,
        chapterSlug: item.chapter?.slug
      })),
      foreshadows: novel.foreshadows.map((item) => ({
        id: item.id,
        hook: item.hook,
        plannedPayoff: item.plannedPayoff ?? undefined,
        status: item.status,
        firstMentionChapterSlug: item.firstMentionChapter?.slug,
        payoffChapterSlug: item.payoffChapter?.slug
      }))
    };
  } catch {
    return null;
  }
}

export async function getNovelGraphData(novelSlug: string): Promise<NovelGraphData | null> {
  if (!isDatabaseConfigured) {
    return getDemoGraphData(novelSlug);
  }

  try {
    const novel = (await prisma.novel.findUnique({
      where: {
        slug: novelSlug
      },
      include: {
        chapters: {
          select: {
            wordCount: true
          }
        },
        entities: {
          include: {
            sourceRelations: true
          },
          orderBy: {
            updatedAt: "desc"
          }
        }
      }
    })) as GraphNovelRow | null;

    if (!novel) {
      return null;
    }

    const nodes = novel.entities
      .filter(isGraphEntity)
      .map((entity) => ({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        summary: entity.summary ?? undefined,
        tags: entity.tags
      }));

    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = novel.entities.flatMap((entity) =>
      entity.sourceRelations
        .filter((relation) => nodeIds.has(relation.sourceId) && nodeIds.has(relation.targetId))
        .map((relation) => ({
          id: relation.id,
          sourceId: relation.sourceId,
          targetId: relation.targetId,
          type: relation.type,
          description: relation.description ?? undefined,
          remark: relation.remark ?? undefined,
          note: relation.note ?? undefined
        }))
    );

    return {
      novel: {
        id: novel.id,
        slug: novel.slug,
        title: novel.title,
        premise: novel.premise ?? undefined,
        summary: novel.summary ?? undefined,
        genre: novel.genre ?? undefined,
        tone: novel.tone ?? undefined,
        lengthCategory: novel.lengthCategory ?? "MEDIUM",
        status: novel.status,
        updatedAt: novel.updatedAt.toISOString(),
        chapterCount: novel.chapters.length,
        wordCount: novel.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0)
      },
      nodes,
      edges
    };
  } catch {
    return null;
  }
}

export async function getNovelStyleWorkspace(
  novelSlug: string
): Promise<NovelStyleWorkspace | null> {
  if (!isDatabaseConfigured) {
    throw new NovelStyleRepositoryError("DATABASE_NOT_CONFIGURED");
  }

  const novel = (await prisma.novel.findUnique({
    where: {
      slug: novelSlug
    },
    include: {
      chapters: {
        select: {
          wordCount: true
        }
      },
      styleProfile: true,
      styleSamples: {
        where: {
          isActive: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  })) as StyleWorkspaceNovelRow | null;

  if (!novel) {
    return null;
  }

  return {
    novel: {
      id: novel.id,
      slug: novel.slug,
      title: novel.title,
      premise: novel.premise ?? undefined,
      summary: novel.summary ?? undefined,
      genre: novel.genre ?? undefined,
      tone: novel.tone ?? undefined,
      lengthCategory: novel.lengthCategory ?? "MEDIUM",
      status: novel.status,
      updatedAt: novel.updatedAt.toISOString(),
      chapterCount: novel.chapters.length,
      wordCount: novel.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0)
    },
    profile: novel.styleProfile
      ? toNovelStyleProfileSummary(novel.styleProfile)
      : normalizeStyleProfile({}),
    samples: novel.styleSamples.map(toNovelStyleSampleSummary)
  };
}

export async function updateNovelStyleProfile(
  novelSlug: string,
  raw: unknown
): Promise<NovelStyleProfileSummary> {
  if (!isDatabaseConfigured) {
    throw new NovelStyleRepositoryError("DATABASE_NOT_CONFIGURED");
  }

  const input = normalizeStyleProfile(novelStyleProfileSchema.parse(raw ?? {}));
  const novel = (await prisma.novel.findUnique({
    where: {
      slug: novelSlug
    },
    select: {
      id: true
    }
  })) as { id: string } | null;

  if (!novel) {
    throw new NovelStyleRepositoryError("NOVEL_NOT_FOUND");
  }

  const data = {
    novelId: novel.id,
    ...toStyleProfilePersistenceInput(input)
  };

  const profile = await prisma.novelStyleProfile.upsert({
    where: {
      novelId: novel.id
    },
    create: data,
    update: toStyleProfilePersistenceInput(input)
  });

  return toNovelStyleProfileSummary(profile);
}

export async function addNovelStyleSample(
  novelSlug: string,
  raw: unknown
): Promise<NovelStyleSampleSummary> {
  if (!isDatabaseConfigured) {
    throw new NovelStyleRepositoryError("DATABASE_NOT_CONFIGURED");
  }

  const input = novelStyleSampleSchema.parse(raw);
  const novel = (await prisma.novel.findUnique({
    where: {
      slug: novelSlug
    },
    select: {
      id: true
    }
  })) as { id: string } | null;

  if (!novel) {
    throw new NovelStyleRepositoryError("NOVEL_NOT_FOUND");
  }

  const sample = await prisma.novelStyleSample.create({
    data: {
      novelId: novel.id,
      title: input.title?.trim() || undefined,
      sourceType: "MANUAL_PASTE",
      content: input.content.trim(),
      note: input.note?.trim() || undefined
    }
  });

  return toNovelStyleSampleSummary(sample);
}

export async function saveChapterDraft(
  novelSlug: string,
  chapterSlug: string,
  input: {
    plainText: string;
    source: "manual" | "autosave";
    note?: string;
    expectedUpdatedAt?: string;
  }
): Promise<{
  chapter: {
    slug: string;
    wordCount: number;
    updatedAt: string;
  };
  version: {
    id: string;
    source: string;
    createdAt: string;
    wordCount: number;
  } | null;
}> {
  if (!isDatabaseConfigured) {
    throw new ChapterRepositoryError("DATABASE_NOT_CONFIGURED");
  }

  const rawText = input.plainText;
  const wordCount = estimateWordCount(rawText.trim());
  const content = toParagraphBlocks(rawText);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const novel = (await tx.novel.findUnique({
      where: {
        slug: novelSlug
      },
      select: {
        id: true
      }
    })) as { id: string } | null;

    if (!novel) {
      throw new ChapterRepositoryError("NOVEL_NOT_FOUND");
    }

    const chapter = (await tx.chapter.findFirst({
      where: {
        slug: chapterSlug,
        novelId: novel.id
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true
      }
    })) as { id: string; slug: string; updatedAt: Date } | null;

    if (!chapter) {
      throw new ChapterRepositoryError("CHAPTER_NOT_FOUND");
    }

    const updateWhere: {
      id: string;
      updatedAt?: Date;
    } = {
      id: chapter.id
    };

    if (input.expectedUpdatedAt) {
      updateWhere.updatedAt = new Date(input.expectedUpdatedAt);
    }

    const updateResult = await tx.chapter.updateMany({
      where: {
        ...updateWhere
      },
      data: {
        plainText: rawText,
        content,
        wordCount
      }
    });

    if (updateResult.count === 0) {
      if (input.expectedUpdatedAt) {
        throw new ChapterRepositoryError("STALE_CHAPTER_DRAFT");
      }

      throw new ChapterRepositoryError("CHAPTER_NOT_FOUND");
    }

    const updatedChapter = (await tx.chapter.findFirst({
      where: {
        id: chapter.id
      },
      select: {
        slug: true,
        wordCount: true,
        updatedAt: true
      }
    })) as { slug: string; wordCount: number; updatedAt: Date } | null;

    if (!updatedChapter) {
      throw new ChapterRepositoryError("CHAPTER_NOT_FOUND");
    }

    let version: {
      id: string;
      source: string;
      createdAt: Date;
    } | null = null;

    if (input.source === "manual") {
      version = await tx.chapterVersion.create({
        data: {
          chapterId: chapter.id,
          source: input.source,
          note: input.note?.trim() || null,
          content,
          plainText: rawText
        },
        select: {
          id: true,
          source: true,
          createdAt: true
        }
      });
    }

    return {
      chapter: {
        slug: updatedChapter.slug,
        wordCount: updatedChapter.wordCount,
        updatedAt: updatedChapter.updatedAt.toISOString()
      },
      version: version
        ? {
            id: version.id,
            source: version.source,
            createdAt: version.createdAt.toISOString(),
            wordCount
          }
        : null
    };
  });
}

export async function createChapter(novelSlug: string): Promise<{
  chapter: {
    slug: string;
    title: string;
    order: number;
  };
}> {
  if (!isDatabaseConfigured) {
    throw new ChapterRepositoryError("DATABASE_NOT_CONFIGURED");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const novel = (await tx.novel.findUnique({
          where: {
            slug: novelSlug
          },
          select: {
            id: true
          }
        })) as { id: string } | null;

        if (!novel) {
          throw new ChapterRepositoryError("NOVEL_NOT_FOUND");
        }

        const lastChapter = (await tx.chapter.findFirst({
          where: {
            novelId: novel.id
          },
          orderBy: {
            order: "desc"
          },
          select: {
            order: true
          }
        })) as { order: number } | null;

        const order = (lastChapter?.order ?? 0) + 1;
        const title = `第 ${order} 章`;
        const slug = await createUniqueChapterSlug(`chapter-${order}`, async (candidate) =>
          tx.chapter.findFirst({
            where: {
              novelId: novel.id,
              slug: candidate
            },
            select: {
              id: true
            }
          })
        );

        const chapter = await tx.chapter.create({
          data: {
            novelId: novel.id,
            slug,
            title,
            order,
            content: [],
            plainText: "",
            wordCount: 0
          },
          select: {
            slug: true,
            title: true,
            order: true
          }
        });

        return {
          chapter
        };
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Chapter create conflict.");
}

export async function rebuildNovelStyleProfile(
  novelSlug: string
): Promise<NovelStyleProfileSummary> {
  if (!isDatabaseConfigured) {
    throw new NovelStyleRepositoryError("DATABASE_NOT_CONFIGURED");
  }

  const novel = (await prisma.novel.findUnique({
    where: {
      slug: novelSlug
    },
    include: {
      styleSamples: {
        where: {
          isActive: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  })) as { id: string; styleSamples: Array<{ content: string }> } | null;

  if (!novel) {
    throw new NovelStyleRepositoryError("NOVEL_NOT_FOUND");
  }

  const fallback = buildStyleRebuildFallback(novel.styleSamples.map((item) => item.content));
  const now = new Date();

  const profile = await prisma.novelStyleProfile.upsert({
    where: {
      novelId: novel.id
    },
    create: {
      novelId: novel.id,
      ...toStyleProfilePersistenceInput({
        ...fallback,
        lastGeneratedAt: now.toISOString()
      })
    },
    update: toStyleProfilePersistenceInput({
      ...fallback,
      lastGeneratedAt: now.toISOString()
    })
  });

  return toNovelStyleProfileSummary(profile);
}

export async function getChapterEditorData(
  novelSlug: string,
  chapterSlug: string
): Promise<ChapterEditorData | null> {
  if (!isDatabaseConfigured) {
    return getDemoChapterEditor(novelSlug, chapterSlug);
  }

  try {
    const novel = (await prisma.novel.findUnique({
      where: {
        slug: novelSlug
      },
      include: {
        chapters: {
          orderBy: {
            order: "asc"
          },
          include: {
            versions: {
              orderBy: {
                createdAt: "desc"
              },
              take: 10
            }
          }
        },
        entities: true,
        styleProfile: true,
        outlines: {
          include: {
            chapter: {
              select: {
                slug: true
              }
            }
          },
          orderBy: [
            {
              depth: "asc"
            },
            {
              order: "asc"
            }
          ]
        },
        foreshadows: {
          include: {
            firstMentionChapter: {
              select: {
                slug: true
              }
            },
            payoffChapter: {
              select: {
                slug: true
              }
            }
          }
        }
      }
    })) as ChapterEditorNovelRow | null;

    const chapter = novel?.chapters.find((item) => item.slug === chapterSlug);

    if (!novel || !chapter) {
      return null;
    }

    return {
      novel: {
        id: novel.id,
        slug: novel.slug,
        title: novel.title,
        premise: novel.premise ?? undefined,
        summary: novel.summary ?? undefined,
        genre: novel.genre ?? undefined,
        tone: novel.tone ?? undefined,
        lengthCategory: novel.lengthCategory ?? "MEDIUM",
        status: novel.status,
        updatedAt: novel.updatedAt.toISOString(),
        chapterCount: novel.chapters.length,
        wordCount: novel.chapters.reduce((sum, item) => sum + item.wordCount, 0)
      },
      voiceRules: toStringArray(novel.voiceRules),
      styleProfile: novel.styleProfile
        ? toNovelStyleProfileSummary(novel.styleProfile)
        : undefined,
      chapter: {
        id: chapter.id,
        slug: chapter.slug,
        title: chapter.title,
        summary: chapter.summary ?? undefined,
        sceneGoal: chapter.sceneGoal ?? undefined,
        order: chapter.order,
        status: chapter.status,
        wordCount: chapter.wordCount || estimateWordCount(chapter.plainText),
        updatedAt: chapter.updatedAt.toISOString(),
        excerpt: excerpt(chapter.plainText),
        content: chapter.plainText
      },
      chapters: novel.chapters.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        summary: item.summary ?? undefined,
        sceneGoal: item.sceneGoal ?? undefined,
        order: item.order,
        status: item.status,
        wordCount: item.wordCount || estimateWordCount(item.plainText),
        excerpt: excerpt(item.plainText)
      })),
      versions: chapter.versions.map(
        (version): ChapterVersionSummary => ({
          id: version.id,
          source: version.source,
          note: version.note ?? undefined,
          createdAt: version.createdAt.toISOString(),
          wordCount: estimateWordCount(version.plainText)
        })
      ),
      entities: novel.entities.map((entity) => ({
        id: entity.id,
        type: entity.type,
        name: entity.name,
        summary: entity.summary ?? undefined,
        tags: entity.tags
      })),
      relevantOutlines: novel.outlines
        .filter((item) => item.chapter?.slug === chapterSlug || item.depth === 0)
        .map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary ?? undefined,
          depth: item.depth,
          order: item.order,
          status: item.status,
          chapterSlug: item.chapter?.slug
        })),
      memory: buildChapterMemory({
        currentChapter: {
          slug: chapter.slug,
          title: chapter.title,
          order: chapter.order,
          sceneGoal: chapter.sceneGoal ?? undefined
        },
        chapters: novel.chapters.map((item) => ({
          slug: item.slug,
          title: item.title,
          summary: item.summary ?? undefined,
          excerpt: excerpt(item.plainText),
          order: item.order
        })),
        outlines: novel.outlines.map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary ?? undefined,
          depth: item.depth,
          order: item.order,
          status: item.status,
          chapterSlug: item.chapter?.slug
        })),
        foreshadows: novel.foreshadows.map((item) => ({
          id: item.id,
          hook: item.hook,
          plannedPayoff: item.plannedPayoff ?? undefined,
          status: item.status,
          firstMentionChapterSlug: item.firstMentionChapter?.slug,
          payoffChapterSlug: item.payoffChapter?.slug
        })),
        entities: novel.entities.map((entity) => ({
          id: entity.id,
          type: entity.type,
          name: entity.name,
          summary: entity.summary ?? undefined,
          tags: entity.tags
        }))
      }),
      foreshadows: novel.foreshadows.map((item) => ({
        id: item.id,
        hook: item.hook,
        plannedPayoff: item.plannedPayoff ?? undefined,
        status: item.status,
        firstMentionChapterSlug: item.firstMentionChapter?.slug,
        payoffChapterSlug: item.payoffChapter?.slug
      }))
    };
  } catch {
    return null;
  }
}
