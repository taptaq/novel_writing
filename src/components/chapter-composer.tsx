"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  assistModes,
  modelSelections,
  type AssistMode,
  type ModelSelection,
  type WritingAssistResponse
} from "@/lib/ai/types";
import { writingSkillPresets, type WritingSkillPresetId } from "@/lib/novel-writing-skills";
import { estimateWordCount } from "@/lib/text/word-count";
import type { ChapterEditorData } from "@/types/domain";

interface ChapterComposerProps {
  novelSlug: string;
  chapterSlug: string;
  data: ChapterEditorData;
  basePath?: string;
}

const SIDEBAR_COLLAPSE_STORAGE_KEY = "chapter-composer-sidebar-collapsed";
const AUTOSAVE_DELAY_MS = 1200;

type SaveRequestState = "idle" | "saving" | "saved" | "error";
type ChapterDialog = "diff" | "context" | null;

type SaveDraftSource = "manual" | "autosave";

type SaveDraftResponse = {
  chapter: {
    slug: string;
    updatedAt: string;
    wordCount: number;
  };
  version: {
    id: string;
    source: string;
    createdAt: string;
    wordCount: number;
  } | null;
};

type SaveDraftRequest = {
  plainText: string;
  source: SaveDraftSource;
  expectedUpdatedAt?: string;
};

type CreateChapterResponse = {
  chapter: {
    slug: string;
    title: string;
    order: number;
  };
};

const modeLabels: Record<AssistMode, string> = {
  continue: "继续写",
  rewrite: "改写润色",
  outline: "结构检查",
  audit: "前后检查"
};

const modelLabels: Record<ModelSelection, string> = {
  auto: "自动",
  kimi: "Kimi",
  glm: "GLM",
  mimo: "Mimo",
  minimax: "MiniMax",
  qwen: "Qwen",
  deepseek: "DeepSeek",
  fallback: "系统兜底"
};

const primaryActionLabels: Record<AssistMode, string> = {
  continue: "帮我继续往下接",
  rewrite: "帮我改顺一点",
  outline: "帮我看看有没有跑偏",
  audit: "帮我检查前后有没有冲突"
};

type StyleProfileUiState =
  | {
      kind: "toggle";
    }
  | {
      kind: "message";
      message: string;
    };

type AssistRequestBody = {
  novelSlug: string;
  chapterSlug: string;
  mode: AssistMode;
  modelSelection: ModelSelection;
  skillPresetId?: WritingSkillPresetId;
  disableStyleProfile: boolean;
  instruction: string;
  currentText: string;
};

export function getStyleProfileUiState(
  mode: AssistMode,
  styleProfile: ChapterEditorData["styleProfile"]
): StyleProfileUiState {
  if (mode !== "continue" && mode !== "rewrite") {
    return {
      kind: "message",
      message: "当前模式暂时不用文风参考"
    };
  }

  if (!styleProfile) {
    return {
      kind: "message",
      message: "这本书还没有可用的文风参考"
    };
  }

  return {
    kind: "toggle"
  };
}

export function buildAssistRequestBody(input: AssistRequestBody) {
  return input;
}

function getSaveStateLabel(isDirty: boolean, saveRequestState: SaveRequestState) {
  if (saveRequestState === "saving") {
    return "保存中";
  }

  if (saveRequestState === "error") {
    return "保存失败";
  }

  if (isDirty) {
    return "有未保存改动";
  }

  return "已保存";
}

function getSidebarCollapsedFromStorage(storage: Pick<Storage, "getItem"> | undefined) {
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function setSidebarCollapsedInStorage(storage: Pick<Storage, "setItem"> | undefined, value: boolean) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, String(value));
  } catch {
    // Ignore storage failures so render interaction stays usable.
  }
}

function buildChapterPath(basePath: string, novelSlug: string, nextChapterSlug: string) {
  return `${basePath}/${novelSlug}/chapters/${nextChapterSlug}`;
}

function getPlainErrorMessage(issue: unknown, fallback: string) {
  if (!(issue instanceof Error)) {
    return fallback;
  }

  return issue.message || fallback;
}

function buildDiffParagraphs(previousText: string, currentText: string) {
  const previousParagraphs = previousText.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  const currentParagraphs = currentText.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  const rowCount = Math.max(previousParagraphs.length, currentParagraphs.length);

  return Array.from({ length: rowCount }, (_, index) => ({
    before: previousParagraphs[index] ?? "（这一段之前还没有）",
    after: currentParagraphs[index] ?? "（这一段现在被删掉了）"
  })).filter((item) => item.before !== item.after);
}

export function ChapterComposer({
  novelSlug,
  chapterSlug,
  data,
  basePath = "/novels"
}: ChapterComposerProps) {
  const isDemoFallback = data.source === "demo";
  const initialDraft = data.chapter.content ?? "";
  const [draft, setDraft] = useState(initialDraft);
  const [lastSavedDraft, setLastSavedDraft] = useState(initialDraft);
  const [saveRequestState, setSaveRequestState] = useState<SaveRequestState>("saved");
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [chapterActionFeedback, setChapterActionFeedback] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(data.chapter.updatedAt ?? data.versions[0]?.createdAt ?? null);
  const [activeDialog, setActiveDialog] = useState<ChapterDialog>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [instruction, setInstruction] = useState("继续往下写，但保持克制，不要堆形容词，让紧张感落在动作和停顿上。");
  const [mode, setMode] = useState<AssistMode>("continue");
  const [modelSelection, setModelSelection] = useState<ModelSelection>("auto");
  const [skillPresetId, setSkillPresetId] = useState<WritingSkillPresetId | "none">("none");
  const [disableStyleProfile, setDisableStyleProfile] = useState(false);
  const [result, setResult] = useState<WritingAssistResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredDraft = useDeferredValue(draft);
  const draftRef = useRef(draft);
  const lastSavedDraftRef = useRef(lastSavedDraft);
  const lastServerUpdatedAtRef = useRef<string | null>(data.chapter.updatedAt ?? data.versions[0]?.createdAt ?? null);
  const savePromiseRef = useRef<Promise<boolean> | null>(null);
  const saveRequestSourceRef = useRef<SaveDraftSource | null>(null);
  const saveRequestSnapshotRef = useRef<string | null>(null);
  const isCreatingChapterRef = useRef(false);
  const isSwitchingChapterRef = useRef(false);

  const liveWordCount = useMemo(() => estimateWordCount(deferredDraft), [deferredDraft]);
  const isDirty = draft !== lastSavedDraft;
  const openForeshadows = data.foreshadows.filter((item) => item.status === "OPEN");
  const styleProfileUiState = getStyleProfileUiState(mode, data.styleProfile);
  const selectedSkillPreset = writingSkillPresets.find((item) => item.id === skillPresetId);
  const chapterGoal = data.chapter.sceneGoal ?? data.memory?.currentFocus ?? "先补一句这章要推进什么，AI 给建议会更准。";
  const latestManualVersion = data.versions.find((item) => item.source === "manual");
  const diffParagraphs = buildDiffParagraphs(lastSavedDraft, draft);
  const diffWordDelta = estimateWordCount(draft) - estimateWordCount(lastSavedDraft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    lastSavedDraftRef.current = lastSavedDraft;
  }, [lastSavedDraft]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsSidebarCollapsed(getSidebarCollapsedFromStorage(window.localStorage));
  }, []);

  useEffect(() => {
    if (isDemoFallback || !isDirty || saveRequestState === "saving" || saveRequestState === "error") {
      return;
    }

    const timerId = globalThis.setTimeout(() => {
      void persistDraft("autosave");
    }, AUTOSAVE_DELAY_MS);

    return () => {
      globalThis.clearTimeout(timerId);
    };
  }, [isDemoFallback, isDirty, saveRequestState, draft, novelSlug, chapterSlug]);

  function applySkillPreset(value: WritingSkillPresetId | "none") {
    setSkillPresetId(value);

    const preset = writingSkillPresets.find((item) => item.id === value);
    if (!preset) {
      return;
    }

    setMode(preset.mode);
    setInstruction(preset.instruction);
  }

  async function persistDraft(source: SaveDraftSource) {
    const snapshot = draftRef.current;

    if (snapshot === lastSavedDraftRef.current) {
      return true;
    }

    if (
      source === "manual" &&
      savePromiseRef.current &&
      saveRequestSourceRef.current === "manual" &&
      saveRequestSnapshotRef.current === snapshot
    ) {
      return savePromiseRef.current;
    }

    if (savePromiseRef.current) {
      await savePromiseRef.current;
    }

    const nextSnapshot = draftRef.current;
    if (nextSnapshot === lastSavedDraftRef.current) {
      return true;
    }

    const saveTask = (async () => {
      setSaveRequestState("saving");
      setSaveFeedback(null);

      try {
        const requestBody: SaveDraftRequest = {
          plainText: nextSnapshot,
          source
        };

        if (lastServerUpdatedAtRef.current) {
          requestBody.expectedUpdatedAt = lastServerUpdatedAtRef.current;
        }

        const response = await fetch(`/api/novels/${novelSlug}/chapters/${chapterSlug}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          if (response.status === 409) {
            throw new Error("这章在别处被改过，请刷新后再继续。");
          }

          throw new Error(source === "manual" ? "手动保存失败，请稍后再试。" : "自动保存失败，请稍后再试。");
        }

        const payload = (await response.json()) as SaveDraftResponse;
        setLastSavedDraft(nextSnapshot);
        lastSavedDraftRef.current = nextSnapshot;
        lastServerUpdatedAtRef.current = payload.chapter.updatedAt;
        setLastSavedAt(payload.chapter.updatedAt);
        setSaveRequestState("saved");
        return true;
      } catch (issue) {
        setSaveRequestState("error");
        setSaveFeedback(getPlainErrorMessage(issue, source === "manual" ? "手动保存失败，请稍后再试。" : "自动保存失败，请稍后再试。"));
        return false;
      }
    })();

    savePromiseRef.current = saveTask;
    saveRequestSourceRef.current = source;
    saveRequestSnapshotRef.current = nextSnapshot;
    const didSave = await saveTask;

    if (savePromiseRef.current === saveTask) {
      savePromiseRef.current = null;
      saveRequestSourceRef.current = null;
      saveRequestSnapshotRef.current = null;
    }

    return didSave;
  }

  function navigateToChapter(nextChapterSlug: string) {
    if (typeof window === "undefined") {
      return;
    }

    window.location.assign(buildChapterPath(basePath, novelSlug, nextChapterSlug));
  }

  function handleDraftChange(value: string) {
    setDraft(value);
    setChapterActionFeedback(null);
    if (saveRequestState === "error") {
      setSaveRequestState("idle");
      setSaveFeedback(null);
    }
  }

  async function handleManualSave() {
    if (isDemoFallback) {
      setSaveFeedback("当前是演示章节，数据库恢复后才能正式保存。");
      return;
    }

    await persistDraft("manual");
  }

  function toggleSidebar() {
    const nextValue = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextValue);
    setSidebarCollapsedInStorage(typeof window === "undefined" ? undefined : window.localStorage, nextValue);
  }

  async function handleChapterSelect(nextChapterSlug: string) {
    if (nextChapterSlug === chapterSlug || isSwitchingChapterRef.current) {
      return;
    }

    isSwitchingChapterRef.current = true;

    if (isDirty && !isDemoFallback) {
      const didSave = await persistDraft("autosave");
      if (!didSave) {
        isSwitchingChapterRef.current = false;
        return;
      }
    }

    navigateToChapter(nextChapterSlug);
  }

  async function handleCreateChapter() {
    if (isDemoFallback) {
      setChapterActionFeedback("当前是演示章节，数据库恢复后才能新建章节。");
      return;
    }

    if (isCreatingChapterRef.current) {
      return;
    }

    isCreatingChapterRef.current = true;
    setIsCreatingChapter(true);
    setChapterActionFeedback(null);

    if (isDirty) {
      const didSave = await persistDraft("autosave");
      if (!didSave) {
        isCreatingChapterRef.current = false;
        setIsCreatingChapter(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/novels/${novelSlug}/chapters`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("新建章节失败，请稍后再试。");
      }

      const payload = (await response.json()) as CreateChapterResponse;
      navigateToChapter(payload.chapter.slug);
    } catch (issue) {
      setChapterActionFeedback(getPlainErrorMessage(issue, "新建章节失败，请稍后再试。"));
    } finally {
      isCreatingChapterRef.current = false;
      setIsCreatingChapter(false);
    }
  }

  async function requestAssist() {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          buildAssistRequestBody({
            novelSlug,
            chapterSlug,
            mode,
            modelSelection,
            skillPresetId: skillPresetId === "none" ? undefined : skillPresetId,
            disableStyleProfile,
            instruction,
            currentText: draft
          })
        )
      });

      if (!response.ok) {
        throw new Error("AI 请求失败，请检查环境变量或后端日志。");
      }

      const payload = (await response.json()) as WritingAssistResponse;
      startTransition(() => {
        setResult(payload);
      });
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "AI 请求失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  function applySuggestion(text: string, strategy: "append" | "replace") {
    startTransition(() => {
      if (strategy === "replace") {
        setDraft(text);
        if (saveRequestState === "error") {
          setSaveRequestState("idle");
          setSaveFeedback(null);
        }
        return;
      }

      const nextDraft = `${draft.trim()}\n\n${text}`.trim();
      setDraft(nextDraft);
      if (saveRequestState === "error") {
        setSaveRequestState("idle");
        setSaveFeedback(null);
      }
    });
  }

  return (
    <div className={isSidebarCollapsed ? "chapter-editor-grid chapter-editor-grid-collapsed" : "chapter-editor-grid"}>
      <aside
        className={
          isSidebarCollapsed
            ? "panel chapter-editor-sidebar chapter-editor-sidebar-collapsed"
            : "panel chapter-editor-sidebar"
        }
      >
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">写作导航</p>
            <h2>{isSidebarCollapsed ? "章节栏" : "章节目录"}</h2>
            {isSidebarCollapsed ? null : <p className="assist-meta">可以随时切换到别的章节查看或继续写。</p>}
          </div>
          <button className="button-secondary" type="button" onClick={toggleSidebar}>
            {isSidebarCollapsed ? "展开章节栏" : "收起章节栏"}
          </button>
        </div>

        {isSidebarCollapsed ? null : (
          <div className="stack-column">
            <button
              className="button-primary"
              type="button"
              onClick={handleCreateChapter}
              disabled={isCreatingChapter}
            >
              {isCreatingChapter ? "新建中..." : "新建章节"}
            </button>

            <div className="chapter-nav-list" aria-label="章节目录">
              {data.chapters.map((chapter) => {
                const isActive = chapter.slug === chapterSlug;

                return (
                  <a
                    key={chapter.id}
                    href={buildChapterPath(basePath, novelSlug, chapter.slug)}
                    className={isActive ? "chapter-nav-link chapter-nav-link-active" : "chapter-nav-link"}
                    aria-current={isActive ? "page" : undefined}
                    onClick={(event) => {
                      event.preventDefault();
                      void handleChapterSelect(chapter.slug);
                    }}
                  >
                    <strong>{chapter.title}</strong>
                    <span className="chapter-nav-meta">
                      {chapter.wordCount} 字
                      {isActive ? " · 当前章节" : ""}
                    </span>
                    {chapter.excerpt ? <span className="chapter-nav-excerpt">{chapter.excerpt}</span> : null}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      <section className="panel panel-soft chapter-editor-main">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">正文编辑</p>
            <h2>{data.chapter.title}</h2>
          </div>
          <div className="stats-inline">
            <span className="stat-pill">章节字数 {liveWordCount}</span>
            <span className="stat-pill">状态 {data.chapter.status}</span>
          </div>
        </div>

        {isDemoFallback ? (
          <div className="note-box">
            <p>当前是示例章节，可以先体验流程。</p>
            <p>正式保存和新建章节，需要进入真实作品。</p>
          </div>
        ) : null}

        <div className="note-box">
          <p>先写正文就行。卡住了，再用右边这些辅助功能。</p>
        </div>

        <div className="panel chapter-editor-toolbar">
          <div className="toolbar-row">
            <button className="button-primary" type="button" onClick={handleManualSave}>
              立即保存
            </button>
            <button className="button-secondary" type="button" onClick={() => setActiveDialog("diff")}>
              查看版本变化
            </button>
            <button className="button-secondary" type="button" onClick={() => setActiveDialog("context")}>
              查看相关设定
            </button>
          </div>

          <div className="save-status" aria-live="polite">
            <span
              className={
                saveRequestState === "saving"
                  ? "status-dot status-busy"
                  : saveRequestState === "error"
                    ? "status-dot status-error"
                    : isDirty
                      ? "status-dot status-dirty"
                    : "status-dot"
              }
            />
            <span>{getSaveStateLabel(isDirty, saveRequestState)}</span>
            {lastSavedAt ? <span className="save-status-meta">最近一次保存 {lastSavedAt}</span> : null}
          </div>

          {saveFeedback ? <p className="save-feedback">{saveFeedback}</p> : null}
          {chapterActionFeedback ? <p className="save-feedback">{chapterActionFeedback}</p> : null}
        </div>

        <label className="field">
          <span className="field-label">这章要推进什么</span>
          <span className="field-helper">{data.chapter.sceneGoal ?? "暂时还没定，先写也没问题。"}</span>
        </label>

        <textarea
          className="editor-textarea"
          value={draft}
          onInput={(event) => handleDraftChange((event.target as HTMLTextAreaElement).value)}
          spellCheck={false}
          placeholder="开始写吧。这里是你这一章的正文。"
        />
      </section>

      <aside className="stack-column chapter-sidebar chapter-editor-aside">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">当前目标</p>
              <h2>本章目标</h2>
            </div>
          </div>

          <div className="note-box">
            <p>{chapterGoal}</p>
          </div>
        </section>

        {data.memory ? (
          <section className="panel memory-panel">
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">前文记忆</p>
                <h2>已写 {data.memory.previousChapterCount} 章</h2>
              </div>
            </div>

            {data.memory.storySoFar.length > 0 ? (
              <div className="memory-block">
                <p className="field-label">前情简述</p>
                <ul className="plain-list compact-list">
                  {data.memory.storySoFar.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="empty-state">这是前几章的位置。等你写出更多章节后，这里会自动整理简要回顾。</p>
            )}

            {data.memory.activeStoryLines.length > 0 ? (
              <div className="memory-block">
                <p className="field-label">故事线</p>
                <ul className="plain-list compact-list">
                  {data.memory.activeStoryLines.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {data.memory.openThreads.length > 0 ? (
              <div className="memory-block">
                <p className="field-label">还没回收的线索</p>
                <ul className="plain-list compact-list">
                  {data.memory.openThreads.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">当前线索</p>
              <h2>人物与伏笔</h2>
            </div>
          </div>

          {data.entities.length > 0 ? (
            <div className="tag-list">
              {data.entities.map((entity) => (
                <span key={entity.id} className="tag">
                  {entity.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="empty-state">还没有关键人物，先补主角、对手和关键关系就够用了。</p>
          )}

          {openForeshadows.length > 0 ? (
            <ul className="plain-list compact-list">
              {openForeshadows.map((item) => (
                <li key={item.id}>{item.hook}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">目前没有未回收伏笔，先直接推进这一章也可以。</p>
          )}
        </section>

        <section className="panel writing-assist-panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">AI 辅助</p>
              <h2>这次想让它帮什么</h2>
            </div>
            <span className={isPending ? "status-dot status-busy" : "status-dot"} />
          </div>

          <label className="field">
            <span className="field-label">先选一种辅助方式</span>
            <div className="mode-grid">
              {assistModes.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={item === mode ? "mode-button mode-button-active" : "mode-button"}
                  onClick={() => setMode(item)}
                >
                  {modeLabels[item]}
                </button>
              ))}
            </div>
          </label>

          <div className="field" role="group" aria-label="写作技能">
            <span className="field-label">常用写作技能</span>
            <div className="skill-choice-grid">
              <button
                type="button"
                className={skillPresetId === "none" ? "skill-choice skill-choice-active" : "skill-choice"}
                onClick={() => applySkillPreset("none")}
                aria-pressed={skillPresetId === "none"}
              >
                不使用
              </button>
              {writingSkillPresets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={skillPresetId === item.id ? "skill-choice skill-choice-active" : "skill-choice"}
                  onClick={() => applySkillPreset(item.id)}
                  aria-pressed={skillPresetId === item.id}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {selectedSkillPreset ? (
            <div className="skill-preset-card">
              <div>
                <p className="field-label">{selectedSkillPreset.sourceName}</p>
                <p>{selectedSkillPreset.summary}</p>
              </div>
              <div className="tag-list">
                {selectedSkillPreset.focus.map((item) => (
                  <span key={item} className="tag">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <label className="field">
            <span className="field-label">告诉 AI 你想怎么写</span>
            <textarea
              className="instruction-textarea"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              spellCheck={false}
              placeholder="比如：把这一段改得更克制一点，减少形容词，用动作和环境细节传达紧张感。"
            />
          </label>

          <details className="details-panel">
            <summary className="details-summary">更多设置</summary>
            <div className="details-body stack-column">
              <label className="field">
                <span className="field-label">模型选择</span>
                <span className="field-helper">不确定选哪个，就用自动。</span>
                <select
                  className="text-input"
                  name="modelSelection"
                  value={modelSelection}
                  onChange={(event) => setModelSelection(event.target.value as ModelSelection)}
                >
                  {modelSelections.map((item) => (
                    <option key={item} value={item}>
                      {modelLabels[item]}
                    </option>
                  ))}
                </select>
              </label>

              {styleProfileUiState.kind === "toggle" ? (
                <div className="field" role="group" aria-label="文风资产开关">
                  <span className="field-label">按本书语气来写</span>
                  <div className="toolbar-row">
                    <button
                      className={disableStyleProfile ? "button-secondary" : "button-primary"}
                      type="button"
                      onClick={() => setDisableStyleProfile(false)}
                      aria-pressed={!disableStyleProfile}
                    >
                      按本书语气来写
                    </button>
                    <button
                      className={disableStyleProfile ? "button-primary" : "button-secondary"}
                      type="button"
                      onClick={() => setDisableStyleProfile(true)}
                      aria-pressed={disableStyleProfile}
                    >
                      这次先不套用本书语气
                    </button>
                  </div>
                </div>
              ) : (
                <p className="field-helper">{styleProfileUiState.message}</p>
              )}

              <div className="field">
                <span className="field-label">写作提醒</span>
                <ul className="plain-list compact-list">
                  {data.voiceRules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>

          <button className="button-primary" type="button" onClick={requestAssist} disabled={isSubmitting}>
            {isSubmitting ? "处理中..." : primaryActionLabels[mode]}
          </button>

          {error ? <p className="error-text">{error}</p> : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">AI 输出</p>
              <h2>候选建议</h2>
            </div>
          </div>

          {result ? (
            <div className="stack-column">
              <article className="suggestion-card suggestion-primary">
                <div className="suggestion-header">
                  <h3>{result.primary.title}</h3>
                  <div className="action-row">
                    <button className="button-secondary" type="button" onClick={() => applySuggestion(result.primary.text, "append")}>
                      追加
                    </button>
                    <button className="button-secondary" type="button" onClick={() => applySuggestion(result.primary.text, "replace")}>
                      替换
                    </button>
                  </div>
                </div>
                <p className="muted-text">{result.summary}</p>
                <p className="assist-meta">
                  本次使用：{result.meta.resolvedModel}
                  {result.meta.usedFallback ? "（系统兜底）" : ""}
                </p>
                <pre className="suggestion-body">{result.primary.text}</pre>
                <p className="explain-text">{result.primary.why}</p>
              </article>

              {result.alternatives.map((item) => (
                <article key={item.title} className="suggestion-card">
                  <div className="suggestion-header">
                    <h3>{item.title}</h3>
                  </div>
                  <pre className="suggestion-body">{item.text}</pre>
                  <p className="explain-text">{item.why}</p>
                </article>
              ))}

              {result.warnings.length > 0 ? (
                <div className="note-box">
                  <p className="field-label">提醒</p>
                  <ul className="plain-list compact-list">
                    {result.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.nextContext.length > 0 ? (
                <div className="note-box">
                  <p className="field-label">下一步可补的上下文</p>
                  <ul className="plain-list compact-list">
                    {result.nextContext.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="empty-state">先点一次右边按钮，这里就会出现候选稿。</p>
          )}
        </section>
      </aside>

      {activeDialog === "diff" ? (
        <div className="light-dialog-backdrop" role="presentation">
          <section className="light-dialog" role="dialog" aria-modal="true" aria-label="改动对比">
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">版本 Diff</p>
                <h2>改动对比</h2>
              </div>
              <button className="button-secondary" type="button" onClick={() => setActiveDialog(null)}>
                关闭
              </button>
            </div>

            <div className="dialog-summary-grid">
              <div className="note-box">
                <p className="field-label">当前草稿</p>
                <p>{estimateWordCount(draft)} 字</p>
              </div>
              <div className="note-box">
                <p className="field-label">相对最近保存</p>
                <p>{diffWordDelta >= 0 ? `多了 ${diffWordDelta} 字` : `少了 ${Math.abs(diffWordDelta)} 字`}</p>
              </div>
            </div>

            <p className="field-helper">
              {latestManualVersion
                ? "默认按最近一次保存基线来比，方便你先看眼前这次改了什么。"
                : "还没有手动保存版本，先按最近一次保存基线给你看改动。"}
            </p>

            <div className="diff-preview-grid">
              <article className="panel diff-panel">
                <p className="field-label">最近保存内容</p>
                <pre className="suggestion-body diff-body">{lastSavedDraft || "（最近保存内容还是空白）"}</pre>
              </article>
              <article className="panel diff-panel">
                <p className="field-label">当前草稿</p>
                <pre className="suggestion-body diff-body">{draft || "（当前草稿还是空白）"}</pre>
              </article>
            </div>

            {diffParagraphs.length > 0 ? (
              <div className="stack-column">
                <p className="field-label">重点改动</p>
                {diffParagraphs.slice(0, 6).map((item, index) => (
                  <div key={`${item.before}-${item.after}-${index}`} className="diff-row">
                    <div className="diff-cell">
                      <strong>之前</strong>
                      <p>{item.before}</p>
                    </div>
                    <div className="diff-cell">
                      <strong>现在</strong>
                      <p>{item.after}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">这一版和最近保存内容还没有差异。</p>
            )}
          </section>
        </div>
      ) : null}

      {activeDialog === "context" ? (
        <div className="light-dialog-backdrop" role="presentation">
          <section className="light-dialog" role="dialog" aria-modal="true" aria-label="相关设定">
            <div className="panel-header">
              <div>
                <p className="panel-eyebrow">相关设定</p>
                <h2>本章相关资料</h2>
              </div>
              <button className="button-secondary" type="button" onClick={() => setActiveDialog(null)}>
                关闭
              </button>
            </div>

            <div className="dialog-context-grid">
              <section className="panel panel-soft">
                <p className="field-label">相关人物</p>
                {data.entities.length > 0 ? (
                  <div className="tag-list">
                    {data.entities.map((entity) => (
                      <span key={entity.id} className="tag">
                        {entity.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">这章还没挂上关键人物。</p>
                )}
              </section>

              <section className="panel panel-soft">
                <p className="field-label">未回收伏笔</p>
                {openForeshadows.length > 0 ? (
                  <ul className="plain-list compact-list">
                    {openForeshadows.map((item) => (
                      <li key={item.id}>{item.hook}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-state">目前没有还挂着的伏笔。</p>
                )}
              </section>
            </div>

            <section className="panel panel-soft">
              <p className="field-label">本章相关大纲</p>
              {data.relevantOutlines.length > 0 ? (
                <div className="stack-column">
                  {data.relevantOutlines.map((item) => (
                    <article key={item.id} className="note-box">
                      <p className="field-label">{item.title}</p>
                      <p>{item.summary ?? "这一条还没补摘要，先按标题推进就行。"}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty-state">这章还没挂相关大纲，先写正文也可以。</p>
              )}
            </section>
          </section>
        </div>
      ) : null}
    </div>
  );
}
