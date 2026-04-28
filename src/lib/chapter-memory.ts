import type {
  ChapterMemorySummary,
  ChapterSummary,
  ForeshadowSummary,
  OutlineSummary,
  StoryEntitySummary
} from "@/types/domain";

type ChapterMemoryInput = {
  currentChapter: Pick<ChapterSummary, "slug" | "title" | "order" | "sceneGoal">;
  chapters: Array<Pick<ChapterSummary, "slug" | "title" | "order" | "summary" | "excerpt">>;
  outlines: OutlineSummary[];
  foreshadows: ForeshadowSummary[];
  entities: StoryEntitySummary[];
};

const MAX_STORY_ITEMS = 4;
const MAX_LINE_ITEMS = 4;
const MAX_THREAD_ITEMS = 5;
const MAX_ENTITY_ITEMS = 6;

function compact(value?: string, maxLength = 96) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function formatChapterMemory(chapter: ChapterMemoryInput["chapters"][number]) {
  const brief = compact(chapter.summary) ?? compact(chapter.excerpt) ?? "暂无简要摘要。";
  return `第${chapter.order}章《${chapter.title}》：${brief}`;
}

function formatOutline(item: OutlineSummary) {
  const summary = compact(item.summary);
  return summary ? `${item.title}：${summary}` : item.title;
}

function formatThread(item: ForeshadowSummary) {
  const payoff = compact(item.plannedPayoff, 72);
  return payoff ? `${item.hook} -> ${payoff}` : item.hook;
}

function formatEntity(item: StoryEntitySummary) {
  const summary = compact(item.summary, 54);
  return summary ? `${item.name}：${summary}` : item.name;
}

export function buildChapterMemory(input: ChapterMemoryInput): ChapterMemorySummary {
  const previousChapters = input.chapters
    .filter((chapter) => chapter.order < input.currentChapter.order)
    .sort((left, right) => left.order - right.order);

  const storySoFar = previousChapters.slice(-MAX_STORY_ITEMS).map(formatChapterMemory);
  const activeStoryLines = input.outlines
    .filter((item) => item.depth <= 1)
    .sort((left, right) => left.depth - right.depth || left.order - right.order)
    .slice(0, MAX_LINE_ITEMS)
    .map(formatOutline);
  const openThreads = input.foreshadows
    .filter((item) => item.status === "OPEN")
    .slice(0, MAX_THREAD_ITEMS)
    .map(formatThread);
  const keyEntities = input.entities.slice(0, MAX_ENTITY_ITEMS).map(formatEntity);

  return {
    previousChapterCount: previousChapters.length,
    storySoFar,
    activeStoryLines,
    openThreads,
    keyEntities,
    currentFocus: compact(input.currentChapter.sceneGoal, 80)
  };
}
