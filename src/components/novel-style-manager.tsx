"use client";

import { useState } from "react";
import type {
  NovelStyleProfileSummary,
  NovelStyleSampleSummary,
  NovelStyleWorkspace
} from "@/types/domain";

type NovelStyleManagerProps = {
  novelSlug: string;
  initialData: NovelStyleWorkspace;
};

type SampleDraft = {
  title: string;
  note: string;
  content: string;
};

type RequestState = {
  savingProfile: boolean;
  addingSample: boolean;
  rebuilding: boolean;
};

const profileSections: Array<{
  key: keyof Pick<
    NovelStyleProfileSummary,
    | "styleRules"
    | "avoidRules"
    | "dialogueRules"
    | "narrationRules"
    | "rhythmRules"
    | "imageryRules"
  >;
  label: string;
}> = [
  { key: "styleRules", label: "风格规则" },
  { key: "avoidRules", label: "避让规则" },
  { key: "dialogueRules", label: "对白规则" },
  { key: "narrationRules", label: "叙述规则" },
  { key: "rhythmRules", label: "节奏规则" },
  { key: "imageryRules", label: "意象规则" }
];

function formatDate(value?: string) {
  if (!value) {
    return "尚未提炼";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}

function toMultilineValue(lines: string[]) {
  return lines.join("\n");
}

function toLineArray(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
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

  return fallback;
}

export function NovelStyleManager({ novelSlug, initialData }: NovelStyleManagerProps) {
  const [profile, setProfile] = useState(initialData.profile);
  const [samples, setSamples] = useState(initialData.samples);
  const [summaryDraft, setSummaryDraft] = useState(initialData.profile.styleSummary ?? "");
  const [profileDrafts, setProfileDrafts] = useState<Record<string, string>>(
    Object.fromEntries(
      profileSections.map(({ key }) => [key, toMultilineValue(initialData.profile[key] ?? [])])
    )
  );
  const [sampleDraft, setSampleDraft] = useState<SampleDraft>({
    title: "",
    note: "",
    content: ""
  });
  const [requestState, setRequestState] = useState<RequestState>({
    savingProfile: false,
    addingSample: false,
    rebuilding: false
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setBusy(key: keyof RequestState, value: boolean) {
    setRequestState((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateDraft(key: string, value: string) {
    setProfileDrafts((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleProfileSave() {
    setBusy("savingProfile", true);
    setFeedback(null);
    setError(null);

    const payload: NovelStyleProfileSummary = {
      ...profile,
      styleSummary: summaryDraft.trim(),
      styleRules: toLineArray(profileDrafts.styleRules ?? ""),
      avoidRules: toLineArray(profileDrafts.avoidRules ?? ""),
      dialogueRules: toLineArray(profileDrafts.dialogueRules ?? ""),
      narrationRules: toLineArray(profileDrafts.narrationRules ?? ""),
      rhythmRules: toLineArray(profileDrafts.rhythmRules ?? ""),
      imageryRules: toLineArray(profileDrafts.imageryRules ?? "")
    };

    try {
      const response = await fetch(`/api/novels/${novelSlug}/style`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as
        | { profile: NovelStyleProfileSummary }
        | { error?: string; message?: string; issues?: Array<{ message?: string }> };

      if (!response.ok || !("profile" in result)) {
        setError(readErrorMessage(result, "保存文风资产失败"));
        return;
      }

      setProfile(result.profile);
      setSummaryDraft(result.profile.styleSummary ?? "");
      setProfileDrafts(
        Object.fromEntries(
          profileSections.map(({ key }) => [key, toMultilineValue(result.profile[key] ?? [])])
        )
      );
      setFeedback("文风资产已保存。");
    } catch {
      setError("保存文风资产失败");
    } finally {
      setBusy("savingProfile", false);
    }
  }

  async function handleSampleSubmit() {
    setBusy("addingSample", true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch(`/api/novels/${novelSlug}/style/samples`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: sampleDraft.title.trim(),
          note: sampleDraft.note.trim(),
          content: sampleDraft.content.trim()
        })
      });
      const result = (await response.json()) as
        | { sample: NovelStyleSampleSummary }
        | { error?: string; message?: string; issues?: Array<{ message?: string }> };

      if (!response.ok || !("sample" in result)) {
        setError(readErrorMessage(result, "保存参考样文失败"));
        return;
      }

      setSamples((current) => [...current, result.sample]);
      setSampleDraft({
        title: "",
        note: "",
        content: ""
      });
      setFeedback("参考样文已加入。");
    } catch {
      setError("保存参考样文失败");
    } finally {
      setBusy("addingSample", false);
    }
  }

  async function handleRebuild() {
    setBusy("rebuilding", true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch(`/api/novels/${novelSlug}/style/rebuild`, {
        method: "POST"
      });
      const result = (await response.json()) as
        | { profile: NovelStyleProfileSummary }
        | { error?: string; message?: string; issues?: Array<{ message?: string }> };

      if (!response.ok || !("profile" in result)) {
        setError(readErrorMessage(result, "重新提炼失败"));
        return;
      }

      setProfile(result.profile);
      setSummaryDraft(result.profile.styleSummary ?? "");
      setProfileDrafts(
        Object.fromEntries(
          profileSections.map(({ key }) => [key, toMultilineValue(result.profile[key] ?? [])])
        )
      );
      setFeedback("文风规则已重新提炼。");
    } catch {
      setError("重新提炼失败");
    } finally {
      setBusy("rebuilding", false);
    }
  }

  return (
    <div className="page-stack style-page-stack">
      <section className="panel style-manager-panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">文风页</p>
            <h2>让 AI 更像这本书</h2>
            <p className="assist-meta">这里用来整理这本书的语气、句子感觉和参考样文。</p>
          </div>
          <div className="stats-inline">
            <span className="stat-pill">{profile.status}</span>
            <span className="stat-pill">{formatDate(profile.lastGeneratedAt)}</span>
          </div>
        </div>

        <div className="style-manager-grid">
          <article className="info-card style-panel-block">
            <div className="title-row">
              <h3>这本书现在的语气规则</h3>
            </div>

            <label className="field">
              <span className="field-label">一句话文风感觉</span>
              <textarea
                className="form-textarea form-textarea-compact"
                value={summaryDraft}
                onChange={(event) => setSummaryDraft(event.target.value)}
              />
            </label>

            <div className="style-rule-grid">
              {profileSections.map((section) => (
                <label key={section.key} className="field">
                  <span className="field-label">{section.label}</span>
                  <textarea
                    className="form-textarea form-textarea-compact"
                    value={profileDrafts[section.key] ?? ""}
                    onChange={(event) => updateDraft(section.key, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="action-row">
              <button
                type="button"
                className="button-primary"
                disabled={requestState.savingProfile}
                onClick={handleProfileSave}
              >
                {requestState.savingProfile ? "保存中..." : "保存这些规则"}
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={requestState.rebuilding}
                onClick={handleRebuild}
              >
                {requestState.rebuilding ? "整理中..." : "重新整理规则"}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="panel style-manager-panel">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">投喂样文</p>
            <h2>上传你认可的文字</h2>
          </div>
        </div>

        <div className="style-manager-grid">
          <article className="info-card style-panel-block">
            <div className="title-row">
              <h3>已收录样文</h3>
              <span className="stat-pill">{samples.length} 条</span>
            </div>

            {samples.length > 0 ? (
              <div className="style-sample-list">
                {samples.map((sample) => (
                  <article key={sample.id} className="style-sample-item">
                    <div className="title-row">
                      <h3>{sample.title || "未命名样文"}</h3>
                      <span className="tag">{sample.sourceType}</span>
                    </div>
                    {sample.note ? <p className="assist-meta">{sample.note}</p> : null}
                    <p>{sample.content}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">还没有样文，先贴一段你喜欢的就行。</p>
            )}
          </article>

          <article className="info-card style-panel-block">
            <div className="title-row">
              <h3>新增样文</h3>
            </div>

            <p className="assist-meta">把你认可的文字贴进来，AI 会更容易学到这本书该有的感觉。</p>

            <div className="stack-column">
              <div className="creation-grid creation-grid-2">
                <label className="field">
                  <span className="field-label">标题</span>
                  <input
                    className="text-input"
                    value={sampleDraft.title}
                    onChange={(event) =>
                      setSampleDraft((current) => ({
                        ...current,
                        title: event.target.value
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span className="field-label">备注</span>
                  <input
                    className="text-input"
                    value={sampleDraft.note}
                    onChange={(event) =>
                      setSampleDraft((current) => ({
                        ...current,
                        note: event.target.value
                      }))
                    }
                  />
                </label>
              </div>

              <label className="field">
                <span className="field-label">样文内容</span>
                <textarea
                  className="form-textarea"
                  value={sampleDraft.content}
                  onChange={(event) =>
                    setSampleDraft((current) => ({
                      ...current,
                      content: event.target.value
                    }))
                  }
                />
              </label>

              <div className="action-row">
                <button
                  type="button"
                  className="button-primary"
                  disabled={requestState.addingSample}
                  onClick={handleSampleSubmit}
                >
                  {requestState.addingSample ? "保存中..." : "加入这段样文"}
                </button>
              </div>
            </div>
          </article>
        </div>

        {feedback ? <p className="assist-meta">{feedback}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </div>
  );
}
