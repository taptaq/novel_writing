"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import {
  detectSetupFileType,
  readSetupFileAsText
} from "@/lib/file-text-extractor";
import {
  getLengthFeatureHints,
  getNovelLengthProfile,
  novelLengthOptions
} from "@/lib/novel-length";
import type {
  CharacterSeedInput,
  GraphEntitySeedInput,
  NovelLengthCategory,
  ParsedSetupCharacterSeed,
  ParsedSetupDraft,
  RelationSeedInput
} from "@/types/domain";

type StyleSampleFormInput = {
  title: string;
  content: string;
  note: string;
};

type CreationFormState = {
  title: string;
  category: string;
  subGenre: string;
  targetAudience: string;
  premise: string;
  narrativeView: string;
  storyStructure: string;
  lengthCategory: NovelLengthCategory;
  plannedChapterCount: string;
  targetWordsPerChapter: string;
  worldSeed: string;
  styleGoal: string;
  styleSamples: StyleSampleFormInput[];
  characterSeeds: CharacterSeedInput[];
};

type ParsedDraftApplyMode = "replace_all" | "fill_empty";
type CreationMode = "quick" | "ai_parse";
type NovelCreationFormProps = {
  initialCreationMode?: CreationMode;
  initialParsedSetupDraft?: ParsedSetupDraft | null;
};

type ParsedSetupGraphDraft = {
  factionSeeds: GraphEntitySeedInput[];
  locationSeeds: GraphEntitySeedInput[];
  relationSeeds: RelationSeedInput[];
};

const MIN_CHARACTER_SEEDS = 1;
const MAX_STYLE_SAMPLES = 3;

export const createEmptyCharacterSeed = (): CharacterSeedInput => ({
  name: "",
  role: "",
  summary: "",
  factionName: "",
  locationName: ""
});

export function createInitialCharacterSeeds(): CharacterSeedInput[] {
  return [createEmptyCharacterSeed()];
}

export function addCharacterSeed(characterSeeds: CharacterSeedInput[]): CharacterSeedInput[] {
  return [...characterSeeds, createEmptyCharacterSeed()];
}

export function removeCharacterSeed(
  characterSeeds: CharacterSeedInput[],
  index: number
): CharacterSeedInput[] {
  if (characterSeeds.length <= MIN_CHARACTER_SEEDS) {
    return characterSeeds;
  }

  return characterSeeds.filter((_, itemIndex) => itemIndex !== index);
}

const initialCharacterSeeds: CharacterSeedInput[] = createInitialCharacterSeeds();

const initialStyleSamples: StyleSampleFormInput[] = Array.from({ length: MAX_STYLE_SAMPLES }, () => ({
  title: "",
  content: "",
  note: ""
}));

export function createInitialParsedSetupDraft(): ParsedSetupDraft {
  return {
    styleSamples: [],
    factionSeeds: [],
    locationSeeds: [],
    characterSeeds: [],
    relationSeeds: [],
    guessedFields: [],
    missingFields: [],
    confidenceNotes: []
  };
}

export function createInitialParsedGraphDraft(): ParsedSetupGraphDraft {
  return {
    factionSeeds: [],
    locationSeeds: [],
    relationSeeds: []
  };
}

export function canParseSetupSource(setupSourceText: string, setupSourceFileName: string): boolean {
  return setupSourceText.trim().length > 0 || setupSourceFileName.trim().length > 0;
}

const initialFormState: CreationFormState = {
  title: "",
  category: "",
  subGenre: "",
  targetAudience: "",
  premise: "",
  narrativeView: "第三人称有限视角",
  storyStructure: "三幕结构",
  lengthCategory: "MEDIUM",
  plannedChapterCount: String(getNovelLengthProfile("MEDIUM").defaultChapterCount),
  targetWordsPerChapter: String(getNovelLengthProfile("MEDIUM").defaultWordsPerChapter),
  worldSeed: "",
  styleGoal: "",
  styleSamples: initialStyleSamples,
  characterSeeds: initialCharacterSeeds
};

const narrativeViewOptions = ["第一人称", "第三人称有限视角", "双视角 / 多视角", "全知视角"];
const storyStructureOptions = [
  "三幕结构",
  "英雄之旅",
  "节拍表",
  "起承转合",
  "多线叙事",
  "自由结构"
];

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const number = Number(trimmed);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function normalizeCharacterSeeds(characterSeeds: CharacterSeedInput[]) {
  return characterSeeds
    .map((item) => ({
      name: item.name?.trim() ?? "",
      role: item.role?.trim() ?? "",
      summary: item.summary?.trim() ?? "",
      factionName: item.factionName?.trim() ?? "",
      locationName: item.locationName?.trim() ?? ""
    }))
    .filter((item) =>
      item.name || item.role || item.summary || item.factionName || item.locationName
    );
}

function normalizeStyleSampleInput(sample?: Partial<StyleSampleFormInput>): StyleSampleFormInput {
  return {
    title: sample?.title?.trim() ?? "",
    content: sample?.content?.trim() ?? "",
    note: sample?.note?.trim() ?? ""
  };
}

function normalizeParsedCharacterSeed(seed?: Partial<ParsedSetupCharacterSeed>): CharacterSeedInput {
  return {
    name: seed?.name?.trim() ?? "",
    role: seed?.role?.trim() ?? "",
    summary: seed?.summary?.trim() ?? "",
    factionName: seed?.factionName?.trim() ?? "",
    locationName: seed?.locationName?.trim() ?? ""
  };
}

function normalizeGraphEntitySeedInput(seed?: Partial<GraphEntitySeedInput>): GraphEntitySeedInput {
  return {
    name: seed?.name?.trim() ?? "",
    summary: seed?.summary?.trim() ?? ""
  };
}

function normalizeRelationSeedInput(seed?: Partial<RelationSeedInput>): RelationSeedInput {
  return {
    sourceName: seed?.sourceName?.trim() ?? "",
    targetName: seed?.targetName?.trim() ?? "",
    type: seed?.type ?? "OTHER",
    description: seed?.description?.trim() ?? "",
    remark: seed?.remark?.trim() ?? "",
    note: seed?.note?.trim() ?? ""
  };
}

export function formatRelationPreview(relation: RelationSeedInput) {
  const sourceName = relation.sourceName?.trim();
  const targetName = relation.targetName?.trim();

  if (!sourceName || !targetName) {
    return "";
  }

  switch (relation.type) {
    case "ALLY":
      return `${sourceName} 与 ${targetName} 是盟友`;
    case "ENEMY":
      return `${sourceName} 与 ${targetName} 处于对立`;
    case "FAMILY":
      return `${sourceName} 与 ${targetName} 是家人`;
    case "MENTOR":
      return `${sourceName} 把 ${targetName} 当老师`;
    case "SUBORDINATE":
      return `${sourceName} 是 ${targetName} 的下属`;
    case "MEMBER_OF":
      return `${sourceName} 属于 ${targetName}`;
    case "ROOTED_IN":
      return `${sourceName} 常驻 ${targetName}`;
    case "OTHER":
    default:
      return `${sourceName} 与 ${targetName} 有关联`;
  }
}

function readLengthCategoryLabel(value?: NovelLengthCategory) {
  return getNovelLengthProfile(value ?? "MEDIUM").label;
}

const parseHintFieldAliases: Record<string, string> = {
  category: "分类",
  subGenre: "细分类型",
  targetAudience: "目标受众",
  premise: "一句话故事核心",
  narrativeView: "叙事视角",
  storyStructure: "故事结构",
  lengthCategory: "篇幅类型",
  plannedChapterCount: "预计总章数",
  targetWordsPerChapter: "每章目标字数",
  worldSeed: "世界观",
  styleGoal: "文风目标",
  styleSamples: "文风参考样文",
  factionSeeds: "势力",
  locationSeeds: "地点",
  characterSeeds: "人物",
  relationSeeds: "关系"
};

const parseHintNoteAliases: Record<string, string> = {
  "length inferred from setup complexity": "篇幅是按设定复杂度推测的",
  "targetAudience inferred from source": "目标受众为推测",
  "no explanation provided": "未提供说明。"
};

function normalizeParseHintFieldLabel(value: string) {
  const trimmed = value.trim();
  return parseHintFieldAliases[trimmed] ?? trimmed;
}

function normalizeParseHintNote(value: string) {
  const trimmed = value.trim();
  return parseHintNoteAliases[trimmed] ?? trimmed;
}

function buildParseHintLine(
  label: string,
  values: string[] | undefined,
  normalizeValue: (value: string) => string,
  emptyValue: string
) {
  const normalized = values?.map(normalizeValue).filter(Boolean) ?? [];
  return `${label}：${normalized.length > 0 ? normalized.join(" / ") : emptyValue}`;
}

function normalizeGraphEntitySeeds(seeds: GraphEntitySeedInput[]) {
  const seen = new Set<string>();

  return seeds
    .map((item) => normalizeGraphEntitySeedInput(item))
    .filter((item) => item.name)
    .filter((item) => {
      const key = item.name;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function normalizeRelationSeeds(seeds: RelationSeedInput[]) {
  const seen = new Set<string>();

  return seeds
    .map((item) => normalizeRelationSeedInput(item))
    .filter((item) => item.sourceName && item.targetName)
    .filter((item) => {
      const key = [
        item.sourceName,
        item.targetName,
        item.type,
        item.description,
        item.remark,
        item.note
      ].join("::");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export function extractParsedSetupGraphDraft(draft: ParsedSetupDraft): ParsedSetupGraphDraft {
  return {
    factionSeeds: normalizeGraphEntitySeeds(draft.factionSeeds ?? []),
    locationSeeds: normalizeGraphEntitySeeds(draft.locationSeeds ?? []),
    relationSeeds: normalizeRelationSeeds(draft.relationSeeds ?? [])
  };
}

export function mergeParsedSetupGraphDraft(
  currentDraft: ParsedSetupGraphDraft,
  parsedDraft: ParsedSetupDraft,
  mode: ParsedDraftApplyMode
): ParsedSetupGraphDraft {
  const nextDraft = extractParsedSetupGraphDraft(parsedDraft);

  if (mode === "replace_all") {
    return nextDraft;
  }

  return {
    factionSeeds: currentDraft.factionSeeds.length > 0 ? currentDraft.factionSeeds : nextDraft.factionSeeds,
    locationSeeds:
      currentDraft.locationSeeds.length > 0 ? currentDraft.locationSeeds : nextDraft.locationSeeds,
    relationSeeds:
      currentDraft.relationSeeds.length > 0 ? currentDraft.relationSeeds : nextDraft.relationSeeds
  };
}

function isCharacterSeedBlank(seed: CharacterSeedInput) {
  return !hasValue(seed.name) &&
    !hasValue(seed.role) &&
    !hasValue(seed.summary) &&
    !hasValue(seed.factionName) &&
    !hasValue(seed.locationName);
}

function hasValue(value?: string | number | null) {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  return typeof value === "string" && value.trim().length > 0;
}

function mergeTextValue(
  currentValue: string,
  nextValue: string | undefined,
  mode: ParsedDraftApplyMode
) {
  if (!hasValue(nextValue)) {
    return currentValue;
  }

  if (mode === "replace_all") {
    return nextValue!.trim();
  }

  return hasValue(currentValue) ? currentValue : nextValue!.trim();
}

function mergeCharacterSeed(
  currentSeed: CharacterSeedInput,
  parsedSeed: CharacterSeedInput | undefined,
  mode: ParsedDraftApplyMode
) {
  if (!parsedSeed) {
    return mode === "replace_all" ? createEmptyCharacterSeed() : currentSeed;
  }

  if (mode === "replace_all") {
    return parsedSeed;
  }

  return isCharacterSeedBlank(currentSeed) ? parsedSeed : currentSeed;
}

export function applyParsedSetupDraft(
  currentForm: CreationFormState,
  draft: ParsedSetupDraft,
  mode: ParsedDraftApplyMode
): CreationFormState {
  const parsedCharacterSeeds = draft.characterSeeds.map((item) => normalizeParsedCharacterSeed(item));
  const nextCharacterSeedCount = Math.max(
    currentForm.characterSeeds.length,
    parsedCharacterSeeds.length,
    MIN_CHARACTER_SEEDS
  );
  const currentCharacterSeeds = Array.from({ length: nextCharacterSeedCount }, (_, index) => {
    return currentForm.characterSeeds[index] ?? createEmptyCharacterSeed();
  });

  return {
    ...currentForm,
    title: mergeTextValue(currentForm.title, draft.title, mode),
    category: mergeTextValue(currentForm.category, draft.category, mode),
    subGenre: mergeTextValue(currentForm.subGenre, draft.subGenre, mode),
    targetAudience: mergeTextValue(currentForm.targetAudience, draft.targetAudience, mode),
    premise: mergeTextValue(currentForm.premise, draft.premise, mode),
    narrativeView: mergeTextValue(currentForm.narrativeView, draft.narrativeView, mode),
    storyStructure: mergeTextValue(currentForm.storyStructure, draft.storyStructure, mode),
    lengthCategory:
      mode === "replace_all"
        ? draft.lengthCategory ?? currentForm.lengthCategory
        : currentForm.lengthCategory ?? draft.lengthCategory ?? "MEDIUM",
    plannedChapterCount: mergeTextValue(
      currentForm.plannedChapterCount,
      draft.plannedChapterCount ? String(draft.plannedChapterCount) : undefined,
      mode
    ),
    targetWordsPerChapter: mergeTextValue(
      currentForm.targetWordsPerChapter,
      draft.targetWordsPerChapter ? String(draft.targetWordsPerChapter) : undefined,
      mode
    ),
    worldSeed: mergeTextValue(currentForm.worldSeed, draft.worldSeed, mode),
    styleGoal: mergeTextValue(currentForm.styleGoal, draft.styleGoal, mode),
    // 文风参考需要用户自己确认，不在这里自动覆盖。
    styleSamples: currentForm.styleSamples.map((sample) => normalizeStyleSampleInput(sample)),
    characterSeeds: currentCharacterSeeds.map((seed, index) =>
      mergeCharacterSeed(seed, parsedCharacterSeeds[index], mode)
    )
  };
}

function readErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "创建作品失败，请稍后再试。";
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  if (
    "issues" in payload &&
    Array.isArray(payload.issues) &&
    payload.issues[0] &&
    typeof payload.issues[0] === "object" &&
    payload.issues[0] !== null &&
    "message" in payload.issues[0] &&
    typeof payload.issues[0].message === "string"
  ) {
    return payload.issues[0].message;
  }

  return "创建作品失败，请稍后再试。";
}

export function NovelCreationForm({
  initialCreationMode = "quick",
  initialParsedSetupDraft = null
}: NovelCreationFormProps = {}) {
  const router = useRouter();
  const [form, setForm] = useState(initialFormState);
  const [creationMode, setCreationMode] = useState<CreationMode>(initialCreationMode);
  const [isExpansionOpen, setIsExpansionOpen] = useState(initialCreationMode === "ai_parse");
  const [setupSourceText, setSetupSourceText] = useState("");
  const [setupSourceFileName, setSetupSourceFileName] = useState("");
  const [parsedSetupDraft, setParsedSetupDraft] = useState<ParsedSetupDraft | null>(
    initialParsedSetupDraft
  );
  const [appliedParsedGraphDraft, setAppliedParsedGraphDraft] = useState<ParsedSetupGraphDraft>(
    initialParsedSetupDraft
      ? extractParsedSetupGraphDraft(initialParsedSetupDraft)
      : createInitialParsedGraphDraft()
  );
  const [isParsingSetup, setIsParsingSetup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof Omit<CreationFormState, "characterSeeds">>(
    key: K,
    value: CreationFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function applyLengthCategory(value: NovelLengthCategory) {
    setForm((current) => {
      const previousProfile = getNovelLengthProfile(current.lengthCategory);
      const nextProfile = getNovelLengthProfile(value);
      const shouldRefreshChapterCount =
        !current.plannedChapterCount ||
        current.plannedChapterCount === String(previousProfile.defaultChapterCount);
      const shouldRefreshWordsPerChapter =
        !current.targetWordsPerChapter ||
        current.targetWordsPerChapter === String(previousProfile.defaultWordsPerChapter);

      return {
        ...current,
        lengthCategory: value,
        plannedChapterCount: shouldRefreshChapterCount
          ? String(nextProfile.defaultChapterCount)
          : current.plannedChapterCount,
        targetWordsPerChapter: shouldRefreshWordsPerChapter
          ? String(nextProfile.defaultWordsPerChapter)
          : current.targetWordsPerChapter
      };
    });
  }

  function updateCharacterSeed(
    index: number,
    key: keyof CharacterSeedInput,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      characterSeeds: current.characterSeeds.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value
            }
          : item
      )
    }));
  }

  function handleAddCharacterSeed() {
    setForm((current) => {
      return {
        ...current,
        characterSeeds: addCharacterSeed(current.characterSeeds)
      };
    });
  }

  function handleRemoveCharacterSeed(index: number) {
    setForm((current) => {
      return {
        ...current,
        characterSeeds: removeCharacterSeed(current.characterSeeds, index)
      };
    });
  }

  function updateStyleSample(index: number, key: keyof StyleSampleFormInput, value: string) {
    setForm((current) => ({
      ...current,
      styleSamples: current.styleSamples.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]: value
            }
          : item
      )
    }));
  }

  async function handleSetupFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      if (setupSourceFileName) {
        setSetupSourceText("");
      }
      setSetupSourceFileName("");
      setParsedSetupDraft(null);
      return;
    }

    setParsedSetupDraft(null);

    try {
      const fileText = await readSetupFileAsText(file);
      setSetupSourceText(fileText);
      setSetupSourceFileName(file.name);
      setError(null);
    } catch (error) {
      setParsedSetupDraft(null);
      setError(
        error instanceof Error
          ? error.message
          : "读取设定文件失败，请改用粘贴文本或重新上传。"
      );
    }
  }

  async function handleSetupParse() {
    if (!canParseSetupSource(setupSourceText, setupSourceFileName)) {
      setError("先贴设定内容或上传文件，再开始解析。");
      return;
    }

    setError(null);
    setIsParsingSetup(true);

    try {
      const sourceType = setupSourceFileName
        ? detectSetupFileType(setupSourceFileName) ?? undefined
        : undefined;
      const response = await fetch("/api/novels/parse-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sourceText: setupSourceText,
          sourceName: setupSourceFileName || undefined,
          sourceType
        })
      });
      const result = (await response.json()) as
        | { draft: ParsedSetupDraft; promptPreview?: string }
        | { error?: string; message?: string; issues?: Array<{ message?: string }> };

      if (!response.ok || !("draft" in result)) {
        setError(readErrorMessage(result));
        return;
      }

      setParsedSetupDraft(result.draft);
    } catch {
      setError("解析设定失败，请检查网络后重试。");
    } finally {
      setIsParsingSetup(false);
    }
  }

  function handleApplyParsedSetup(mode: ParsedDraftApplyMode) {
    if (!parsedSetupDraft) {
      return;
    }

    setForm((current) => applyParsedSetupDraft(current, parsedSetupDraft, mode));
    setAppliedParsedGraphDraft((current) =>
      mergeParsedSetupGraphDraft(current, parsedSetupDraft, mode)
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedCharacterSeeds = normalizeCharacterSeeds(form.characterSeeds);
    const invalidCharacter = normalizedCharacterSeeds.find(
      (item) => !item.name && (item.role || item.summary || item.factionName || item.locationName)
    );

    if (invalidCharacter) {
      setError("人物种子填写了其他信息时，姓名不能为空。");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: form.title,
      category: form.category,
      subGenre: form.subGenre,
      targetAudience: form.targetAudience,
      premise: form.premise,
      narrativeView: form.narrativeView,
      storyStructure: form.storyStructure,
      lengthCategory: form.lengthCategory,
      plannedChapterCount: toOptionalNumber(form.plannedChapterCount),
      targetWordsPerChapter: toOptionalNumber(form.targetWordsPerChapter),
      worldSeed: form.worldSeed,
      styleGoal: form.styleGoal,
      styleSamples: form.styleSamples
        .map((sample) => ({
          title: sample.title.trim(),
          content: sample.content.trim(),
          note: sample.note.trim()
        }))
        .filter((sample) => sample.content.length > 0),
      factionSeeds: appliedParsedGraphDraft.factionSeeds,
      locationSeeds: appliedParsedGraphDraft.locationSeeds,
      characterSeeds: normalizedCharacterSeeds,
      relationSeeds: appliedParsedGraphDraft.relationSeeds
    };

    try {
      const response = await fetch("/api/novels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as
        | { novel: { slug: string } }
        | { error?: string; issues?: Array<{ message?: string }> };

      if (!response.ok || !("novel" in result)) {
        setError(readErrorMessage(result));
        setIsSubmitting(false);
        return;
      }

      router.push(`/novels/${result.novel.slug}`);
    } catch {
      setError("创建作品失败，请检查网络或数据库配置。");
      setIsSubmitting(false);
    }
  }

  const lengthProfile = getNovelLengthProfile(form.lengthCategory);
  const lengthHints = getLengthFeatureHints(form.lengthCategory);
  const canParse = canParseSetupSource(setupSourceText, setupSourceFileName);

  return (
    <form className="creation-form" onSubmit={handleSubmit}>
      <div className="note-box">
        <p>先填最少的，后面再补。</p>
      </div>

      <section className="creation-section">
        <div className="creation-section-heading">
          <h2>第 1 步 / 导入你的想法</h2>
          <p>自己填，或让 AI 先整理。</p>
        </div>

        <div className="creation-grid creation-grid-2">
          <label className="seed-card">
            <div className="seed-card-header">
              <strong>快速新建</strong>
              <input
                type="radio"
                name="creation-mode"
                checked={creationMode === "quick"}
                onChange={() => {
                  setCreationMode("quick");
                  setIsExpansionOpen(false);
                }}
              />
            </div>
            <p>自己填，马上开始。</p>
          </label>

          <label className="seed-card">
            <div className="seed-card-header">
              <strong>AI 解析设定创建</strong>
              <input
                type="radio"
                name="creation-mode"
                checked={creationMode === "ai_parse"}
                onChange={() => {
                  setCreationMode("ai_parse");
                  setIsExpansionOpen(true);
                }}
              />
            </div>
            <p>贴设定，让 AI 先理一遍。</p>
          </label>
        </div>

        {creationMode === "quick" ? (
          <div className="note-box">
            <p className="field-label">当前方式</p>
            <p>现在是快速新建，往下填就行。</p>
          </div>
        ) : (
          <article className="seed-card">
            <div className="creation-section-heading">
              <div>
                <h3>AI 先整理设定</h3>
                <p>贴设定或传文件，先出一版草稿。</p>
              </div>
              <button
                type="button"
                className="button-primary"
                onClick={handleSetupParse}
                disabled={isParsingSetup || !canParse}
              >
                {isParsingSetup ? "解析中..." : "开始解析"}
              </button>
            </div>

            {!canParse ? (
              <div className="note-box">
                <p className="field-label">开始前</p>
                <p>先贴内容，再解析。</p>
              </div>
            ) : null}

            <label className="field">
              <span className="field-label">设定原文</span>
              <textarea
                className="form-textarea"
                value={setupSourceText}
                onChange={(event) => {
                  setSetupSourceText(event.target.value);
                  setParsedSetupDraft(null);
                }}
                placeholder="贴故事设定、人物介绍、世界观说明。"
              />
            </label>

            <div className="creation-grid creation-grid-2">
              <label className="field">
                <span className="field-label">上传设定文件</span>
                <input
                  type="file"
                  className="text-input"
                  accept=".txt,.md,.docx,.pdf"
                  onChange={handleSetupFileChange}
                />
              </label>

              <div className="field">
                <span className="field-label">当前来源</span>
                <div className="note-box">
                  <p>{setupSourceFileName || "还没传文件，先用上面这段文字。"}</p>
                </div>
              </div>
            </div>

            <article className="seed-card">
              <div className="seed-card-header">
                <strong>解析预览</strong>
              </div>

              <div className="creation-grid creation-grid-2">
                <div className="note-box">
                  <p className="field-label">核心信息预览</p>
                  <p>{parsedSetupDraft?.title?.trim() || "书名：待解析"}</p>
                  <p>
                    {parsedSetupDraft
                      ? [
                          parsedSetupDraft.category?.trim(),
                          parsedSetupDraft.subGenre?.trim(),
                          parsedSetupDraft.targetAudience?.trim()
                        ]
                          .filter(Boolean)
                          .join(" / ") || "类型、细分类型、目标受众会显示在这里。"
                      : "类型、细分类型、目标受众会显示在这里。"}
                  </p>
                  <p>
                    {parsedSetupDraft
                      ? [
                          parsedSetupDraft.narrativeView?.trim(),
                          parsedSetupDraft.storyStructure?.trim(),
                          parsedSetupDraft.lengthCategory
                            ? readLengthCategoryLabel(parsedSetupDraft.lengthCategory)
                            : ""
                        ]
                          .filter(Boolean)
                          .join(" / ") || "视角、结构、篇幅类型会显示在这里。"
                      : "视角、结构、篇幅类型会显示在这里。"}
                  </p>
                  <p>
                    {parsedSetupDraft?.premise?.trim() || "一句话故事核心会显示在这里。"}
                  </p>
                </div>

                <div className="note-box">
                  <p className="field-label">规划信息预览</p>
                  <p>
                    {parsedSetupDraft?.plannedChapterCount
                      ? `${parsedSetupDraft.plannedChapterCount} 章`
                      : "预计总章数：待解析"}
                  </p>
                  <p>
                    {parsedSetupDraft?.targetWordsPerChapter
                      ? `约 ${parsedSetupDraft.targetWordsPerChapter} 字 / 章`
                      : "每章目标字数：待解析"}
                  </p>
                  <p>这些会填回下面的规划项。</p>
                </div>
              </div>

              <div className="creation-grid creation-grid-2">
                <div className="note-box">
                  <p className="field-label">设定信息预览</p>
                  <p>{parsedSetupDraft?.worldSeed?.trim() || "世界观 / 初始设定会显示在这里。"}</p>
                  <p>{parsedSetupDraft?.styleGoal?.trim() || "语气 / 文风目标会显示在这里。"}</p>
                </div>

                <div className="note-box">
                  <p className="field-label">解析提示</p>
                  <p>
                    {buildParseHintLine(
                      "AI 推测补全",
                      parsedSetupDraft?.guessedFields,
                      normalizeParseHintFieldLabel,
                      "暂无"
                    )}
                  </p>
                  <p>
                    {buildParseHintLine(
                      "还缺信息",
                      parsedSetupDraft?.missingFields,
                      normalizeParseHintFieldLabel,
                      "暂无"
                    )}
                  </p>
                  <p>
                    {buildParseHintLine(
                      "说明",
                      parsedSetupDraft?.confidenceNotes,
                      normalizeParseHintNote,
                      "暂无"
                    )}
                  </p>
                </div>
              </div>

              <div className="note-box">
                <p className="field-label">人物解析</p>
                {parsedSetupDraft && parsedSetupDraft.characterSeeds.length > 0 ? (
                  <div className="creation-seed-grid">
                    {parsedSetupDraft.characterSeeds.map((item, index) => (
                      <article key={`${item.name}-${index}`} className="seed-card">
                        <div className="seed-card-header">
                          <strong>{item.name || `人物 ${index + 1}`}</strong>
                        </div>
                        <p>{item.role?.trim() || "暂未识别角色定位"}</p>
                        <p>{item.summary?.trim() || "暂未识别人设简述"}</p>
                        <p>
                          {[
                            item.factionName?.trim() ? `势力：${item.factionName.trim()}` : "",
                            item.locationName?.trim() ? `地点：${item.locationName.trim()}` : ""
                          ]
                            .filter(Boolean)
                            .join(" / ") || "暂未识别势力或地点"}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>暂无人物种子，解析后会把识别到的人物逐个列出来。</p>
                )}
              </div>

              <div className="note-box">
                <p className="field-label">图谱预览</p>
                <p>
                  {parsedSetupDraft?.factionSeeds?.length
                    ? `势力：${parsedSetupDraft.factionSeeds
                        .map((item) => item.name?.trim())
                        .filter(Boolean)
                        .join(" / ")}`
                    : "势力：暂无单独识别结果"}
                </p>
                <p>
                  {parsedSetupDraft?.locationSeeds?.length
                    ? `地点：${parsedSetupDraft.locationSeeds
                        .map((item) => item.name?.trim())
                        .filter(Boolean)
                        .join(" / ")}`
                    : "地点：暂无单独识别结果"}
                </p>
                {parsedSetupDraft?.relationSeeds?.length ? (
                  <>
                    <p>已识别关系</p>
                    <ul className="plain-list compact-list">
                      {parsedSetupDraft.relationSeeds
                        .map((item) => formatRelationPreview(item))
                        .filter(Boolean)
                        .map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                    </ul>
                  </>
                ) : (
                  <p>关系：暂无单独识别结果</p>
                )}
                <p>点应用后，这些会一起带进初始关系图。</p>
              </div>

              <div className="note-box">
                <p>应用全部不会覆盖文风参考。</p>
              </div>

              <div className="tag-list">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => handleApplyParsedSetup("replace_all")}
                  disabled={!parsedSetupDraft}
                >
                  应用全部到表单
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => handleApplyParsedSetup("fill_empty")}
                  disabled={!parsedSetupDraft}
                >
                  只填空白项
                </button>
              </div>
            </article>
          </article>
        )}
      </section>

      <section className="creation-section">
        <div className="creation-section-heading">
          <h2>第 2 步 / 先填这些</h2>
          <p>填完就能开始写。</p>
        </div>

        <div className="note-box">
          <p className="field-label">核心信息</p>
          <p>书名、类型、篇幅和一句话设定。</p>
        </div>

        <div className="creation-grid creation-grid-3">
          <label className="field">
            <span className="field-label">书名</span>
            <input
              required
              className="text-input"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">类型</span>
            <input
              required
              className="text-input"
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">细分类型</span>
            <input
              required
              className="text-input"
              value={form.subGenre}
              onChange={(event) => updateField("subGenre", event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">目标受众</span>
            <input
              required
              className="text-input"
              value={form.targetAudience}
              onChange={(event) => updateField("targetAudience", event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">叙事视角</span>
            <span className="field-helper">比如第一人称、第三人称。</span>
            <select
              className="text-input"
              value={form.narrativeView}
              onChange={(event) => updateField("narrativeView", event.target.value)}
            >
              {narrativeViewOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">故事结构</span>
            <span className="field-helper">不确定就先默认。</span>
            <select
              className="text-input"
              value={form.storyStructure}
              onChange={(event) => updateField("storyStructure", event.target.value)}
            >
              {storyStructureOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">篇幅类型</span>
            <span className="field-helper">会影响默认建议。</span>
            <select
              className="text-input"
              value={form.lengthCategory}
              onChange={(event) => applyLengthCategory(event.target.value as NovelLengthCategory)}
            >
              {novelLengthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field-label">一句话故事核心</span>
          <span className="field-helper">用一句话说清这本书在讲什么。</span>
          <textarea
            required
            className="form-textarea"
            value={form.premise}
            onChange={(event) => updateField("premise", event.target.value)}
          />
        </label>
      </section>

      <section className="creation-section">
        <div className="creation-section-heading">
          <h2>第 3 步 / 想补再补</h2>
          <p>这些先空着也可以。</p>
        </div>

        <div className="note-box">
          <p className="field-label">扩展内容</p>
          <p>
            篇幅建议、世界观、文风目标、人物种子、文风参考。现在不填也能创建。
          </p>
        </div>

        {!isExpansionOpen ? (
          <article className="seed-card">
            <div className="creation-section-heading">
              <div>
                <h3>先创建也可以</h3>
                <p>后面再补人物、文风和世界观。</p>
              </div>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setIsExpansionOpen(true)}
              >
                我想继续补细节
              </button>
            </div>
          </article>
        ) : (
          <>
            <article className="length-guidance-card">
              <div>
                <p className="field-label">篇幅建议</p>
                <h3>{lengthProfile.label}</h3>
                <p>{lengthProfile.description}</p>
                <p>{lengthProfile.structureHint}</p>
              </div>
              <div className="tag-list">
                <span className="tag">图谱 {lengthProfile.moduleMode.graph}</span>
                <span className="tag">大纲 {lengthProfile.moduleMode.outline}</span>
                <span className="tag">伏笔 {lengthProfile.moduleMode.foreshadow}</span>
                <span className="tag">资料 {lengthProfile.moduleMode.research}</span>
                <span className="tag">文风 {lengthProfile.moduleMode.style}</span>
              </div>
              <div className="note-box">
                <p className="field-label">功能侧重</p>
                <ul className="plain-list compact-list">
                  {lengthHints.map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ul>
              </div>
            </article>

            <div className="creation-section-heading">
              <div>
                <h3>继续补细节</h3>
                <p>已经够用了的话，也可以先创建；这些内容后面还能继续加。</p>
              </div>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setIsExpansionOpen(false)}
              >
                我先快速建书
              </button>
            </div>

            <div className="creation-grid creation-grid-2">
              <label className="field">
                <span className="field-label">预计总章数</span>
                <input
                  inputMode="numeric"
                  className="text-input"
                  value={form.plannedChapterCount}
                  onChange={(event) => updateField("plannedChapterCount", event.target.value)}
                />
              </label>

              <label className="field">
                <span className="field-label">每章目标字数</span>
                <input
                  inputMode="numeric"
                  className="text-input"
                  value={form.targetWordsPerChapter}
                  onChange={(event) => updateField("targetWordsPerChapter", event.target.value)}
                />
              </label>
            </div>

            <div className="creation-grid creation-grid-2">
              <label className="field">
                <span className="field-label">世界观 / 初始设定</span>
                <textarea
                  className="form-textarea form-textarea-compact"
                  value={form.worldSeed}
                  onChange={(event) => updateField("worldSeed", event.target.value)}
                />
              </label>

              <label className="field">
                <span className="field-label">语气 / 文风目标</span>
                <textarea
                  className="form-textarea form-textarea-compact"
                  value={form.styleGoal}
                  onChange={(event) => updateField("styleGoal", event.target.value)}
                />
              </label>
            </div>

            <section className="creation-section">
              <div className="creation-section-heading">
                <div>
                  <h2>人物种子</h2>
                  <p>先填主角也可以，其他人物后面想到再补。</p>
                </div>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={handleAddCharacterSeed}
                >
                  新增人物
                </button>
              </div>

              <div className="creation-seed-grid">
                {form.characterSeeds.map((character, index) => (
                  <article key={index} className="seed-card">
                    <div className="seed-card-header">
                      <strong>人物 {index + 1}</strong>
                      {form.characterSeeds.length > MIN_CHARACTER_SEEDS ? (
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => handleRemoveCharacterSeed(index)}
                        >
                          删除
                        </button>
                      ) : null}
                    </div>

                    <div className="creation-grid creation-grid-2">
                      <label className="field">
                        <span className="field-label">姓名</span>
                        <input
                          className="text-input"
                          value={character.name ?? ""}
                          onChange={(event) => updateCharacterSeed(index, "name", event.target.value)}
                        />
                      </label>

                      <label className="field">
                        <span className="field-label">身份 / 角色定位</span>
                        <input
                          className="text-input"
                          value={character.role ?? ""}
                          onChange={(event) => updateCharacterSeed(index, "role", event.target.value)}
                        />
                      </label>

                      <label className="field">
                        <span className="field-label">所属势力</span>
                        <input
                          className="text-input"
                          value={character.factionName ?? ""}
                          onChange={(event) =>
                            updateCharacterSeed(index, "factionName", event.target.value)
                          }
                        />
                      </label>

                      <label className="field">
                        <span className="field-label">关键地点</span>
                        <input
                          className="text-input"
                          value={character.locationName ?? ""}
                          onChange={(event) =>
                            updateCharacterSeed(index, "locationName", event.target.value)
                          }
                        />
                      </label>
                    </div>

                    <label className="field">
                      <span className="field-label">简述</span>
                      <textarea
                        className="form-textarea form-textarea-compact"
                        value={character.summary ?? ""}
                        onChange={(event) => updateCharacterSeed(index, "summary", event.target.value)}
                      />
                    </label>
                  </article>
                ))}
              </div>
            </section>

            <section className="creation-section creation-style-section">
              <div className="creation-section-heading">
                <div>
                  <h2>文风参考</h2>
                  <p>这里是给 AI 学你想要的感觉。现在不填，后面也能继续补。</p>
                </div>
              </div>

              <div className="creation-seed-grid">
                {form.styleSamples.map((sample, index) => (
                  <article key={index} className="seed-card style-sample-card">
                    <div className="seed-card-header">
                      <strong>样文 {index + 1}</strong>
                    </div>

                    <div className="creation-grid creation-grid-2">
                      <label className="field">
                        <span className="field-label">标题</span>
                        <input
                          className="text-input"
                          value={sample.title}
                          onChange={(event) => updateStyleSample(index, "title", event.target.value)}
                        />
                      </label>

                      <label className="field">
                        <span className="field-label">备注</span>
                        <input
                          className="text-input"
                          value={sample.note}
                          onChange={(event) => updateStyleSample(index, "note", event.target.value)}
                        />
                      </label>
                    </div>

                    <label className="field">
                      <span className="field-label">样文内容</span>
                      <textarea
                        className="form-textarea form-textarea-compact"
                        value={sample.content}
                        onChange={(event) => updateStyleSample(index, "content", event.target.value)}
                      />
                    </label>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </section>

      <div className="creation-actions">
        <p className="creation-note">先开始最重要，后面都能再改。</p>
        <button type="submit" className="button-primary" disabled={isSubmitting}>
          {isSubmitting ? "创建中..." : "创建这本书"}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}
