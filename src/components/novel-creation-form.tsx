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
  NovelLengthCategory,
  ParsedSetupCharacterSeed,
  ParsedSetupDraft
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

const MAX_CHARACTER_SEEDS = 3;
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
  if (characterSeeds.length >= MAX_CHARACTER_SEEDS) {
    return characterSeeds;
  }

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

const initialStyleSamples: StyleSampleFormInput[] = Array.from({ length: 3 }, () => ({
  title: "",
  content: "",
  note: ""
}));

export function createInitialParsedSetupDraft(): ParsedSetupDraft {
  return {
    styleSamples: [],
    characterSeeds: [],
    guessedFields: [],
    missingFields: [],
    confidenceNotes: []
  };
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

function isCharacterSeedBlank(seed: CharacterSeedInput) {
  return !hasValue(seed.name) &&
    !hasValue(seed.role) &&
    !hasValue(seed.summary) &&
    !hasValue(seed.factionName) &&
    !hasValue(seed.locationName);
}

function isStyleSampleBlank(sample: StyleSampleFormInput) {
  return !hasValue(sample.title) && !hasValue(sample.content) && !hasValue(sample.note);
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
  const parsedCharacterSeeds = draft.characterSeeds
    .slice(0, MAX_CHARACTER_SEEDS)
    .map((item) => normalizeParsedCharacterSeed(item));
  const nextCharacterSeedCount = Math.min(
    MAX_CHARACTER_SEEDS,
    Math.max(currentForm.characterSeeds.length, parsedCharacterSeeds.length, MIN_CHARACTER_SEEDS)
  );
  const currentCharacterSeeds = Array.from({ length: nextCharacterSeedCount }, (_, index) => {
    return currentForm.characterSeeds[index] ?? createEmptyCharacterSeed();
  });
  const parsedStyleSamples = draft.styleSamples
    .slice(0, MAX_STYLE_SAMPLES)
    .map((item) => normalizeStyleSampleInput(item));

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
    styleSamples: currentForm.styleSamples.map((sample, index) => {
      const parsedSample = parsedStyleSamples[index];
      if (!parsedSample) {
        return mode === "replace_all" ? normalizeStyleSampleInput() : sample;
      }

      if (mode === "replace_all") {
        return parsedSample;
      }

      return isStyleSampleBlank(sample) ? parsedSample : sample;
    }),
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

export function NovelCreationForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialFormState);
  const [setupSourceText, setSetupSourceText] = useState("");
  const [setupSourceFileName, setSetupSourceFileName] = useState("");
  const [parsedSetupDraft, setParsedSetupDraft] = useState<ParsedSetupDraft | null>(null);
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
      characterSeeds: normalizedCharacterSeeds,
      relationSeeds: []
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

  return (
    <form className="creation-form" onSubmit={handleSubmit}>
      <section className="creation-section">
        <div className="creation-section-heading">
          <h2>AI 解析设定说明</h2>
          <p>支持粘贴文本或上传设定文件，先生成回填草稿，再由你确认应用。</p>
        </div>

        <label className="field">
          <span className="field-label">设定原文</span>
          <textarea
            className="form-textarea"
            value={setupSourceText}
            onChange={(event) => {
              setSetupSourceText(event.target.value);
              setParsedSetupDraft(null);
            }}
            placeholder="粘贴故事设定、人物介绍、世界观说明等内容，解析后会先生成预览草稿。"
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
              <p>{setupSourceFileName || "未上传文件，当前将使用上方粘贴文本。"}</p>
            </div>
          </div>
        </div>

        <div className="creation-section-heading">
          <button
            type="button"
            className="button-primary"
            onClick={handleSetupParse}
            disabled={isParsingSetup}
          >
            {isParsingSetup ? "解析中..." : "开始解析"}
          </button>
        </div>

        <article className="seed-card">
          <div className="seed-card-header">
            <strong>解析预览</strong>
          </div>

          <div className="creation-grid creation-grid-2">
            <div className="note-box">
              <p className="field-label">一句话 premise</p>
              <p>{parsedSetupDraft?.premise?.trim() || "暂无 premise，解析后会先在这里预览。"}</p>
            </div>

            <div className="note-box">
              <p className="field-label">人物草稿</p>
              <p>
                {parsedSetupDraft && parsedSetupDraft.characterSeeds.length > 0
                  ? parsedSetupDraft.characterSeeds
                      .slice(0, MAX_CHARACTER_SEEDS)
                      .map((item) => item.name)
                      .filter(Boolean)
                      .join(" / ")
                  : "暂无人物种子，解析后会显示可回填的人物摘要。"}
              </p>
            </div>
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
      </section>

      <section className="creation-section">
        <div className="creation-section-heading">
          <h2>基础信息</h2>
          <p>先把立项核心补齐。</p>
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
          <span className="field-label">一句话 premise</span>
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
          <h2>扩展策划</h2>
          <p>可填，但很有用。</p>
        </div>

        <article className="length-guidance-card">
          <div>
            <p className="field-label">默认建议</p>
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
      </section>

      <section className="creation-section">
        <div className="creation-section-heading">
          <div>
            <h2>人物种子</h2>
            <p>支持 1 到 3 个，留空会跳过。</p>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={handleAddCharacterSeed}
            disabled={form.characterSeeds.length >= MAX_CHARACTER_SEEDS}
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
            <p>选填。现在先留空也可以，后续还能在书内继续投喂。</p>
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

      <div className="creation-actions">
        <p className="creation-note">创建后会自动生成作品、人物、势力、地点的初始图谱。</p>
        <button type="submit" className="button-primary" disabled={isSubmitting}>
          {isSubmitting ? "创建中..." : "创建作品"}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
    </form>
  );
}
