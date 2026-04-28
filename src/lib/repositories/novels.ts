import { EntityType, Prisma, RelationType } from "@prisma/client";
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
  GraphEntityKind,
  GraphRelationKind,
  NovelGraphData,
  NovelStyleProfileSummary,
  NovelStyleSampleSummary,
  NovelStyleWorkspace,
  NovelSummary,
  NovelWorkspace
} from "@/types/domain";

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

function mapEntityType(type: GraphEntityKind): EntityType {
  return type;
}

function isGraphEntity<T extends { type: string }>(entity: T): entity is T & { type: GraphEntityKind } {
  return entity.type === "CHARACTER" || entity.type === "FACTION" || entity.type === "LOCATION";
}

function mapRelationType(type: GraphRelationKind): RelationType {
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
  styleRules: Prisma.JsonValue | null;
  avoidRules: Prisma.JsonValue | null;
  dialogueRules: Prisma.JsonValue | null;
  narrationRules: Prisma.JsonValue | null;
  rhythmRules: Prisma.JsonValue | null;
  imageryRules: Prisma.JsonValue | null;
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

export async function getNovelSummaries(): Promise<NovelSummary[]> {
  if (!isDatabaseConfigured) {
    return getDemoNovelSummaries();
  }

  try {
    const novels = await prisma.novel.findMany({
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
    });

    if (novels.length === 0) {
      return getDemoNovelSummaries();
    }

    return novels.map((novel) => ({
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
    }));
  } catch {
    return getDemoNovelSummaries();
  }
}

export async function createNovelWithSeedData(raw: unknown): Promise<NovelSummary> {
  if (!isDatabaseConfigured) {
    throw new Error("Database is not configured.");
  }

  const input = buildNovelCreationInput(raw);
  const genre = [input.novel.category, input.novel.subGenre].filter(Boolean).join(" / ") || undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const createdNovel = await prisma.$transaction(async (tx) => {
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
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
    const novel = await prisma.novel.findUnique({
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
    });

    if (!novel) {
      return getDemoWorkspace(novelSlug);
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
    return getDemoWorkspace(novelSlug);
  }
}

export async function getNovelGraphData(novelSlug: string): Promise<NovelGraphData | null> {
  if (!isDatabaseConfigured) {
    return getDemoGraphData(novelSlug);
  }

  try {
    const novel = await prisma.novel.findUnique({
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
    });

    if (!novel) {
      return getDemoGraphData(novelSlug);
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
    return getDemoGraphData(novelSlug);
  }
}

export async function getNovelStyleWorkspace(
  novelSlug: string
): Promise<NovelStyleWorkspace | null> {
  if (!isDatabaseConfigured) {
    throw new NovelStyleRepositoryError("DATABASE_NOT_CONFIGURED");
  }

  const novel = await prisma.novel.findUnique({
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
  });

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
  const novel = await prisma.novel.findUnique({
    where: {
      slug: novelSlug
    },
    select: {
      id: true
    }
  });

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
  const novel = await prisma.novel.findUnique({
    where: {
      slug: novelSlug
    },
    select: {
      id: true
    }
  });

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

export async function rebuildNovelStyleProfile(
  novelSlug: string
): Promise<NovelStyleProfileSummary> {
  if (!isDatabaseConfigured) {
    throw new NovelStyleRepositoryError("DATABASE_NOT_CONFIGURED");
  }

  const novel = await prisma.novel.findUnique({
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
  });

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
    const novel = await prisma.novel.findUnique({
      where: {
        slug: novelSlug
      },
      include: {
        chapters: {
          orderBy: {
            order: "asc"
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
    });

    const chapter = novel?.chapters.find((item) => item.slug === chapterSlug);

    if (!novel || !chapter) {
      return getDemoChapterEditor(novelSlug, chapterSlug);
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
        excerpt: excerpt(chapter.plainText),
        content: chapter.plainText
      },
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
    return getDemoChapterEditor(novelSlug, chapterSlug);
  }
}
