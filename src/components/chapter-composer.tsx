"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
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
}

const modeLabels: Record<AssistMode, string> = {
  continue: "上下文续写",
  rewrite: "去 AI 味改写",
  outline: "结构建议",
  audit: "一致性审看"
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
      message: "当前模式不使用文风资产"
    };
  }

  if (!styleProfile) {
    return {
      kind: "message",
      message: "当前作品还没有可用文风资产"
    };
  }

  return {
    kind: "toggle"
  };
}

export function buildAssistRequestBody(input: AssistRequestBody) {
  return input;
}

export function ChapterComposer({ novelSlug, chapterSlug, data }: ChapterComposerProps) {
  const [draft, setDraft] = useState(data.chapter.content ?? "");
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

  const liveWordCount = useMemo(() => estimateWordCount(deferredDraft), [deferredDraft]);
  const openForeshadows = data.foreshadows.filter((item) => item.status === "OPEN");
  const styleProfileUiState = getStyleProfileUiState(mode, data.styleProfile);
  const selectedSkillPreset = writingSkillPresets.find((item) => item.id === skillPresetId);

  function applySkillPreset(value: WritingSkillPresetId | "none") {
    setSkillPresetId(value);

    const preset = writingSkillPresets.find((item) => item.id === value);
    if (!preset) {
      return;
    }

    setMode(preset.mode);
    setInstruction(preset.instruction);
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
        return;
      }

      setDraft((current) => `${current.trim()}\n\n${text}`.trim());
    });
  }

  return (
    <div className="chapter-editor-grid">
      <section className="panel panel-soft">
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

        <div className="toolbar-row">
          <button className="button-secondary" type="button">
            自动保存占位
          </button>
          <button className="button-secondary" type="button">
            版本 Diff 占位
          </button>
          <button className="button-secondary" type="button">
            设定链接占位
          </button>
        </div>

        <label className="field">
          <span className="field-label">场景目标</span>
          <span className="field-helper">{data.chapter.sceneGoal ?? "暂未设定场景目标。"}</span>
        </label>

        <textarea
          className="editor-textarea"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          spellCheck={false}
          placeholder="开始写吧。这里的文本会作为 AI 的当前上下文。"
        />
      </section>

      <aside className="stack-column">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">AI 写作面板</p>
              <h2>建议，不代写</h2>
            </div>
            <span className={isPending ? "status-dot status-busy" : "status-dot"} />
          </div>

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

          <label className="field">
            <span className="field-label">模型选择</span>
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

          <label className="field">
            <span className="field-label">写作技能</span>
            <select
              className="text-input"
              name="skillPresetId"
              value={skillPresetId}
              onChange={(event) => applySkillPreset(event.target.value as WritingSkillPresetId | "none")}
            >
              <option value="none">不使用预设</option>
              {writingSkillPresets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

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
            <span className="field-label">自然语言指令</span>
            <textarea
              className="instruction-textarea"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              spellCheck={false}
              placeholder="比如：把这一段改得更克制一点，减少形容词，用动作和环境细节传达紧张感。"
            />
          </label>

          {styleProfileUiState.kind === "toggle" ? (
            <div className="field" role="group" aria-label="文风资产开关">
              <span className="field-label">文风资产</span>
              <div className="toolbar-row">
                <button
                  className={disableStyleProfile ? "button-secondary" : "button-primary"}
                  type="button"
                  onClick={() => setDisableStyleProfile(false)}
                  aria-pressed={!disableStyleProfile}
                >
                  当前已应用文风资产
                </button>
                <button
                  className={disableStyleProfile ? "button-primary" : "button-secondary"}
                  type="button"
                  onClick={() => setDisableStyleProfile(true)}
                  aria-pressed={disableStyleProfile}
                >
                  本次不使用文风约束
                </button>
              </div>
            </div>
          ) : (
            <p className="field-helper">{styleProfileUiState.message}</p>
          )}

          <button className="button-primary" type="button" onClick={requestAssist} disabled={isSubmitting}>
            {isSubmitting ? "AI 思考中..." : `运行 ${modeLabels[mode]}`}
          </button>

          {error ? <p className="error-text">{error}</p> : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">文风护栏</p>
              <h2>去 AI 味规则</h2>
            </div>
          </div>
          <ul className="plain-list">
            {data.voiceRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="panel-eyebrow">上下文</p>
              <h2>人物与伏笔</h2>
            </div>
          </div>

          <div className="tag-list">
            {data.entities.map((entity) => (
              <span key={entity.id} className="tag">
                {entity.name}
              </span>
            ))}
          </div>

          <ul className="plain-list compact-list">
            {openForeshadows.map((item) => (
              <li key={item.id}>{item.hook}</li>
            ))}
          </ul>
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
            <p className="empty-state">先运行一次 AI 面板，这里会显示建议稿、替代方案和风险提醒。</p>
          )}
        </section>
      </aside>
    </div>
  );
}
