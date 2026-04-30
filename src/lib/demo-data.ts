import type {
  ChapterAuditRecordSummary,
  ChapterEditorData,
  ChapterVersionSummary,
  GraphEntityKind,
  NovelGraphData,
  NovelSummary,
  NovelStyleWorkspace,
  NovelWorkspace
} from "../types/domain";
import { buildChapterMemory } from "./chapter-memory";
import { normalizeStyleProfile } from "./novel-style";
import { estimateWordCount, excerpt } from "./text/word-count";

function isoDate(value: string): string {
  return new Date(value).toISOString();
}

function isGraphEntity<T extends { type: string }>(entity: T): entity is T & { type: GraphEntityKind } {
  return entity.type === "CHARACTER" || entity.type === "FACTION" || entity.type === "LOCATION";
}

export const demoSeed = {
  settings: {
    id: "default",
    workspaceName: "Human Draft Studio",
    defaultAiMode: "ON_DEMAND",
    preferredModel: "smart-router",
    aiInterventionHint: "卡文时先提问，不要直接代写。",
    voiceGuardrails: [
      "少用华丽形容词，优先动作和细节。",
      "不要替角色总结情绪，让情绪从行为里露出来。",
      "每次生成都必须保留作者主动权。"
    ]
  },
  novel: {
    id: "novel-tide-and-embers",
    slug: "tide-and-embers",
    title: "潮汐灰烬",
    premise: "一座靠潮汐钟维持秩序的港城，在钟声失准后开始吞没记忆。",
    summary:
      "故事围绕修钟匠学徒沈砚展开。他发现港城的潮汐钟并不只是报时装置，而是一台会替全城筛选记忆的旧式机器。每一次失准，都意味着有人会忘记真正重要的东西。",
    genre: "悬疑 / 都市奇幻",
    tone: "克制、贴地、慢热推进",
    lengthCategory: "MEDIUM" as const,
    category: "悬疑",
    subGenre: "都市奇幻",
    targetAudience: "悬疑 / 都市奇幻读者",
    narrativeView: "第三人称有限视角",
    storyStructure: "多线叙事",
    plannedChapterCount: 18,
    targetWordsPerChapter: 3200,
    styleGoal: "克制、贴地、慢热推进",
    worldSeed: "港城的潮汐钟承担了记忆筛分功能。",
    status: "DRAFTING" as const,
    voiceRules: [
      "少解释，多通过动作、停顿和对话呈现信息。",
      "不要整齐排比，不要一口气堆三个形容词。",
      "冲突优先落在选择和代价，不靠喊口号撑情绪。",
      "对白要区分角色口吻，避免全员同一种文学腔。"
    ],
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    updatedAt: new Date("2026-04-26T09:00:00.000Z")
  },
  volumes: [
    {
      id: "volume-harbor-ash",
      novelId: "novel-tide-and-embers",
      slug: "harbor-of-ash",
      title: "第一卷 灰港回声",
      summary: "沈砚在修钟和送信之间，被卷入潮汐钟失准后的第一轮失忆事件。",
      order: 1
    }
  ],
  chapters: [
    {
      id: "chapter-storm-signal",
      novelId: "novel-tide-and-embers",
      volumeId: "volume-harbor-ash",
      slug: "storm-signal",
      title: "第 1 章 风暴前的报时",
      summary: "夜班报时提前了十二分钟，整座灰港都像被人轻轻错开了一格。",
      sceneGoal: "埋下潮汐钟失准与信件异常的双重悬念。",
      plainText:
        "夜里十一点，灰港的风比平时冷一点。沈砚踩着梯子，拧紧钟楼外侧的铜钉，手背被风刮得发麻。按规矩，报时还要再等十二分钟，可底下的街灯已经亮成一线，钟腔里也先一步传出了低闷的震动。\n\n他停下手，朝海面看了一眼。今晚潮位不高，码头上却没有人说话，连装卸货箱的铁钩都放得格外轻。沈砚把耳朵贴近钟壳，听见里面有第二道节拍，很浅，像是谁在旧钟深处又加了一只看不见的摆轮。\n\n楼下有人喊他名字。送信的孩子气喘吁吁地跑来，怀里抱着一封没写收件人的信。信封潮了一半，墨迹洇开，只有一句还能看清: 别让今晚的第三声钟响落下去。",
      status: "DRAFT" as const,
      order: 1,
      beatLabel: "悬念开场"
    },
    {
      id: "chapter-unopened-letter",
      novelId: "novel-tide-and-embers",
      volumeId: "volume-harbor-ash",
      slug: "unopened-letter",
      title: "第 2 章 没有名字的来信",
      summary: "一封没有收件人的信，逼着沈砚去找一个已经被全城忘记的人。",
      sceneGoal: "推动主角做出行动选择，并引出旧城档案馆。",
      plainText:
        "沈砚把信带回修钟铺的时候，师父还没睡。老齐坐在案边磨刀，灯火压得很低，像是不想让外头的人看见屋里还有光。信封摊在桌上，潮湿的纸边慢慢翘起，像一层旧伤口。\n\n老齐没碰那封信，只问了一句，钟是不是提前响了。沈砚点头。老人手里的磨刀石停了一下，灰白的粉末顺着刀背往下落。他说，灰港的钟可以坏，不能早。早一回，城里就会少一段记得住的东西。\n\n这话说得太轻，轻得像他已经讲过很多遍。可沈砚确定，自己从没听过。他盯着桌上的信，忽然生出一点不合时宜的念头: 如果信没有写收件人，那它会不会本来就是写给一个已经被忘掉的人。",
      status: "DRAFT" as const,
      order: 2,
      beatLabel: "行动诱因"
    }
  ],
  entities: [
    {
      id: "entity-shen-yan",
      novelId: "novel-tide-and-embers",
      type: "CHARACTER" as const,
      name: "沈砚",
      aliases: ["小沈"],
      summary: "修钟匠学徒，做事细，嘴上不快，习惯先听完再判断。",
      tags: ["谨慎", "观察力强", "不爱表态"],
      profile: {
        age: 22,
        voice: "句子短，先说事实，再补判断。",
        hiddenNeed: "想知道母亲失踪那年到底发生了什么。"
      }
    },
    {
      id: "entity-old-qi",
      novelId: "novel-tide-and-embers",
      type: "CHARACTER" as const,
      name: "老齐",
      aliases: ["齐师父"],
      summary: "修钟铺掌柜，见过潮汐钟上一次大修，很多事知道一半，只肯说一半。",
      tags: ["寡言", "护短", "有旧事"],
      profile: {
        voice: "不爱长篇解释，常用短句截断话头。"
      }
    },
    {
      id: "entity-gray-harbor",
      novelId: "novel-tide-and-embers",
      type: "LOCATION" as const,
      name: "灰港",
      aliases: ["港城"],
      summary: "依赖潮汐钟维持日常秩序的海边旧城，居民对遗忘早已形成默契。",
      tags: ["海港", "旧城", "失忆风险"],
      profile: {
        rule: "每逢潮差异常，港城会短暂丢失一段共同记忆。"
      }
    },
    {
      id: "entity-tide-clock",
      novelId: "novel-tide-and-embers",
      type: "ITEM" as const,
      name: "潮汐钟",
      aliases: ["大钟"],
      summary: "灰港的报时核心，同时承担记忆筛分的隐藏功能。",
      tags: ["关键装置", "失准", "记忆"],
      profile: {
        risk: "第三声异常报时会触发大范围记忆错位。"
      }
    }
  ],
  relations: [
    {
      id: "relation-master-apprentice",
      sourceId: "entity-old-qi",
      targetId: "entity-shen-yan",
      type: "MENTOR" as const,
      description: "老齐是沈砚的师父，但一直在隐瞒潮汐钟真正用途。",
      remark: "关系紧张但未公开",
      note: "适合作为详情面板示例数据"
    },
    {
      id: "relation-city-clock",
      sourceId: "entity-gray-harbor",
      targetId: "entity-tide-clock",
      type: "OTHER" as const,
      description: "潮汐钟是灰港秩序的核心设施。",
      remark: "城市秩序中枢",
      note: "后续可作为地点与装置关联示例"
    }
  ],
  outlines: [
    {
      id: "outline-volume-1",
      novelId: "novel-tide-and-embers",
      chapterId: null,
      parentId: null,
      title: "第一卷主线",
      summary: "追查提前报时的原因，确认灰港居民遗忘的不是偶发事件，而是有人为干预。",
      order: 1,
      depth: 0,
      status: "ACTIVE"
    },
    {
      id: "outline-chapter-1",
      novelId: "novel-tide-and-embers",
      chapterId: "chapter-storm-signal",
      parentId: "outline-volume-1",
      title: "异常报时 + 警告信",
      summary: "用提前响起的钟声和匿名来信，建立第一层危机。",
      order: 1,
      depth: 1,
      status: "ACTIVE"
    },
    {
      id: "outline-chapter-2",
      novelId: "novel-tide-and-embers",
      chapterId: "chapter-unopened-letter",
      parentId: "outline-volume-1",
      title: "行动决定",
      summary: "沈砚决定去旧城档案馆找信里提到的人。",
      order: 2,
      depth: 1,
      status: "PLANNED"
    }
  ],
  foreshadows: [
    {
      id: "foreshadow-third-bell",
      novelId: "novel-tide-and-embers",
      hook: "第三声钟响不能落下去",
      plannedPayoff: "揭示第三声会重置港城一段共同记忆。",
      status: "OPEN",
      firstMentionChapterId: "chapter-storm-signal",
      payoffChapterId: null
    },
    {
      id: "foreshadow-missing-recipient",
      novelId: "novel-tide-and-embers",
      hook: "没有收件人的信",
      plannedPayoff: "信的真正收件人是曾经维护过潮汐钟的人。",
      status: "OPEN",
      firstMentionChapterId: "chapter-storm-signal",
      payoffChapterId: null
    }
  ]
};

function toNovelSummary() {
  const wordCount = demoSeed.chapters.reduce((sum, chapter) => sum + estimateWordCount(chapter.plainText), 0);

  return {
    id: demoSeed.novel.id,
    slug: demoSeed.novel.slug,
    title: demoSeed.novel.title,
    premise: demoSeed.novel.premise,
    summary: demoSeed.novel.summary,
    genre: demoSeed.novel.genre,
    tone: demoSeed.novel.tone,
    lengthCategory: demoSeed.novel.lengthCategory,
    status: demoSeed.novel.status,
    updatedAt: demoSeed.novel.updatedAt.toISOString(),
    chapterCount: demoSeed.chapters.length,
    wordCount
  } satisfies NovelSummary;
}

export function getDemoNovelSummaries(): NovelSummary[] {
  return [toNovelSummary()];
}

export function getDemoWorkspace(slug: string): NovelWorkspace | null {
  if (slug !== demoSeed.novel.slug) {
    return null;
  }

  return {
    novel: toNovelSummary(),
    voiceRules: demoSeed.novel.voiceRules,
    chapters: demoSeed.chapters.map((chapter) => ({
      id: chapter.id,
      slug: chapter.slug,
      title: chapter.title,
      summary: chapter.summary,
      sceneGoal: chapter.sceneGoal,
      order: chapter.order,
      status: chapter.status,
      wordCount: estimateWordCount(chapter.plainText),
      excerpt: excerpt(chapter.plainText)
    })),
    entities: demoSeed.entities.map((entity) => ({
      id: entity.id,
      type: entity.type,
      name: entity.name,
      summary: entity.summary,
      tags: entity.tags
    })),
    outlines: demoSeed.outlines.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      depth: item.depth,
      order: item.order,
      status: item.status,
      chapterSlug: demoSeed.chapters.find((chapter) => chapter.id === item.chapterId)?.slug
    })),
    foreshadows: demoSeed.foreshadows.map((item) => ({
      id: item.id,
      hook: item.hook,
      plannedPayoff: item.plannedPayoff,
      status: item.status,
      firstMentionChapterSlug: demoSeed.chapters.find((chapter) => chapter.id === item.firstMentionChapterId)?.slug,
      payoffChapterSlug: demoSeed.chapters.find((chapter) => chapter.id === item.payoffChapterId)?.slug
    }))
  };
}

export function getDemoGraphData(slug: string): NovelGraphData | null {
  const workspace = getDemoWorkspace(slug);

  if (!workspace) {
    return null;
  }

  const nodes = demoSeed.entities
    .filter(isGraphEntity)
    .map((entity) => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      summary: entity.summary,
      tags: entity.tags
    }));

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = demoSeed.relations
    .filter((relation) => nodeIds.has(relation.sourceId) && nodeIds.has(relation.targetId))
    .map((relation) => ({
      id: relation.id,
      sourceId: relation.sourceId,
      targetId: relation.targetId,
      type: relation.type,
      description: relation.description,
      remark: relation.remark,
      note: relation.note
    }));

  return {
    novel: workspace.novel,
    nodes,
    edges
  };
}

export function getDemoStyleWorkspace(slug: string): NovelStyleWorkspace | null {
  const workspace = getDemoWorkspace(slug);

  if (!workspace) {
    return null;
  }

  return {
    novel: workspace.novel,
    profile: normalizeStyleProfile({
      styleSummary: demoSeed.novel.styleGoal,
      styleRules: [
        "少解释，多通过动作、停顿和对白推进。",
        "句子不要太满，情绪落在细节里。"
      ],
      avoidRules: ["不要整齐排比", "不要用总结句替代场面"],
      dialogueRules: ["对白保留留白，不要每句都说透。"],
      narrationRules: ["镜头贴着人物感官走，少跳出评论。"],
      rhythmRules: ["先短句切入，再用稍长句收束信息。"],
      imageryRules: ["意象集中在海风、金属、潮汐、钟声。"],
      status: "READY"
    }),
    samples: [
      {
        id: "demo-style-sample-1",
        title: "灰港开场",
        sourceType: "MANUAL_PASTE",
        content:
          "他停下手，朝海面看了一眼。今晚潮位不高，码头上却没有人说话，连装卸货箱的铁钩都放得格外轻。",
        note: "偏克制，先动作后判断。",
        isActive: true,
        createdAt: demoMeta.generatedAt
      }
    ]
  };
}

export function getDemoChapterEditor(novelSlug: string, chapterSlug: string): ChapterEditorData | null {
  const workspace = getDemoWorkspace(novelSlug);
  const chapter = demoSeed.chapters.find((item) => item.slug === chapterSlug);

  if (!workspace || !chapter) {
    return null;
  }

  return {
    source: "demo",
    novel: workspace.novel,
    voiceRules: workspace.voiceRules,
    chapters: workspace.chapters,
    versions: [
      {
        id: `version-${chapter.id}`,
        source: "seed",
        note: "Initial draft",
        createdAt: demoMeta.generatedAt,
        wordCount: estimateWordCount(chapter.plainText)
      }
    ] satisfies ChapterVersionSummary[],
    chapter: {
      id: chapter.id,
      slug: chapter.slug,
      title: chapter.title,
      summary: chapter.summary,
      sceneGoal: chapter.sceneGoal,
      order: chapter.order,
      status: chapter.status,
      wordCount: estimateWordCount(chapter.plainText),
      updatedAt: demoMeta.generatedAt,
      excerpt: excerpt(chapter.plainText),
      content: chapter.plainText
    },
    entities: workspace.entities,
    relevantOutlines: workspace.outlines.filter((item) => item.chapterSlug === chapterSlug || item.depth === 0),
    memory: buildChapterMemory({
      currentChapter: {
        slug: chapter.slug,
        title: chapter.title,
        order: chapter.order,
        sceneGoal: chapter.sceneGoal
      },
      chapters: workspace.chapters,
      outlines: workspace.outlines,
      foreshadows: workspace.foreshadows,
      entities: workspace.entities
    }),
    foreshadows: workspace.foreshadows.filter((item) => item.firstMentionChapterSlug === chapterSlug || item.status === "OPEN"),
    auditHistory: [
      {
        id: `audit-${chapter.id}-1`,
        createdAt: demoMeta.generatedAt,
        summary: "整体能接上前文，但结尾解释稍微多了一点。",
        primaryTitle: "本章总体判断",
        primaryText: "前半段悬念成立，后半段可以再收一句解释，让危险感留在动作上。",
        warnings: ["老齐那句解释偏满，容易把悬念提前说透。"],
        nextContext: ["把解释拆开，先给动作，再留一句没说完的话。"],
        resolvedProvider: "demo",
        resolvedModel: "demo-audit",
        usedFallback: false
      }
    ] satisfies ChapterAuditRecordSummary[]
  };
}

export const demoMeta = {
  generatedAt: isoDate("2026-04-26T09:00:00.000Z")
};
