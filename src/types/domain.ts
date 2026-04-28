export type NovelStatus = "PLANNING" | "DRAFTING" | "HIATUS" | "COMPLETED" | "ARCHIVED";
export type ChapterStatus = "DRAFT" | "REVIEW" | "READY" | "PUBLISHED";
export type EntityKind = "CHARACTER" | "LOCATION" | "FACTION" | "ITEM" | "RULE" | "EVENT";
export type GraphEntityKind = "CHARACTER" | "FACTION" | "LOCATION";
export type GraphRelationKind =
  | "ALLY"
  | "ENEMY"
  | "FAMILY"
  | "MENTOR"
  | "SUBORDINATE"
  | "OTHER"
  | "MEMBER_OF"
  | "ROOTED_IN";

export interface NovelSummary {
  id: string;
  slug: string;
  title: string;
  premise?: string;
  summary?: string;
  genre?: string;
  tone?: string;
  status: NovelStatus;
  updatedAt: string;
  chapterCount: number;
  wordCount: number;
}

export interface ChapterSummary {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  sceneGoal?: string;
  order: number;
  status: ChapterStatus;
  wordCount: number;
  excerpt?: string;
  content?: string;
}

export interface StoryEntitySummary {
  id: string;
  type: EntityKind;
  name: string;
  summary?: string;
  tags: string[];
}

export interface OutlineSummary {
  id: string;
  title: string;
  summary?: string;
  depth: number;
  order: number;
  status: string;
  chapterSlug?: string;
}

export interface ForeshadowSummary {
  id: string;
  hook: string;
  plannedPayoff?: string;
  status: string;
  firstMentionChapterSlug?: string;
  payoffChapterSlug?: string;
}

export interface NovelWorkspace {
  novel: NovelSummary;
  voiceRules: string[];
  chapters: ChapterSummary[];
  entities: StoryEntitySummary[];
  outlines: OutlineSummary[];
  foreshadows: ForeshadowSummary[];
}

export interface ChapterEditorData {
  novel: NovelSummary;
  voiceRules: string[];
  styleProfile?: NovelStyleProfileSummary;
  chapter: ChapterSummary;
  entities: StoryEntitySummary[];
  relevantOutlines: OutlineSummary[];
  foreshadows: ForeshadowSummary[];
}

export interface StyleSampleInput {
  title?: string;
  content: string;
  note?: string;
}

export interface NovelStyleSampleSummary {
  id: string;
  title?: string;
  sourceType: "USER_SAMPLE" | "EXISTING_CHAPTER" | "MANUAL_PASTE";
  content: string;
  note?: string;
  isActive: boolean;
  createdAt: string;
}

export interface NovelStyleProfileSummary {
  id?: string;
  styleSummary?: string;
  styleRules: string[];
  avoidRules: string[];
  dialogueRules: string[];
  narrationRules: string[];
  rhythmRules: string[];
  imageryRules: string[];
  status: "EMPTY" | "READY" | "FAILED";
  lastGeneratedAt?: string;
}

export interface NovelStyleWorkspace {
  novel: NovelSummary;
  profile: NovelStyleProfileSummary;
  samples: NovelStyleSampleSummary[];
}

export interface CharacterSeedInput {
  name: string;
  role?: string;
  summary?: string;
  factionName?: string;
  locationName?: string;
}

export interface RelationSeedInput {
  sourceName: string;
  targetName: string;
  type: GraphRelationKind;
  description?: string;
  remark?: string;
  note?: string;
}

export interface NovelCreationInput {
  title: string;
  category: string;
  subGenre: string;
  targetAudience: string;
  premise: string;
  narrativeView: string;
  storyStructure: string;
  plannedChapterCount?: number;
  targetWordsPerChapter?: number;
  worldSeed?: string;
  styleGoal?: string;
  styleSamples: StyleSampleInput[];
  characterSeeds: CharacterSeedInput[];
  relationSeeds: RelationSeedInput[];
}

export interface GraphNodeSummary {
  id: string;
  name: string;
  type: GraphEntityKind;
  summary?: string;
  tags: string[];
}

export interface GraphEdgeSummary {
  id: string;
  sourceId: string;
  targetId: string;
  type: GraphRelationKind;
  description?: string;
  remark?: string;
  note?: string;
}

export interface NovelGraphData {
  novel: NovelSummary;
  nodes: GraphNodeSummary[];
  edges: GraphEdgeSummary[];
}
