"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import type { CharacterSeedInput } from "@/types/domain";

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
  plannedChapterCount: string;
  targetWordsPerChapter: string;
  worldSeed: string;
  styleGoal: string;
  styleSamples: StyleSampleFormInput[];
  characterSeeds: CharacterSeedInput[];
};

const initialCharacterSeeds: CharacterSeedInput[] = Array.from({ length: 3 }, () => ({
  name: "",
  role: "",
  summary: "",
  factionName: "",
  locationName: ""
}));

const initialStyleSamples: StyleSampleFormInput[] = Array.from({ length: 3 }, () => ({
  title: "",
  content: "",
  note: ""
}));

const initialFormState: CreationFormState = {
  title: "",
  category: "",
  subGenre: "",
  targetAudience: "",
  premise: "",
  narrativeView: "第三人称有限视角",
  storyStructure: "三幕结构",
  plannedChapterCount: "",
  targetWordsPerChapter: "",
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

function readErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "创建作品失败，请稍后再试。";
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
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

  return (
    <form className="creation-form" onSubmit={handleSubmit}>
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
          <h2>人物种子</h2>
          <p>支持 1 到 3 个，留空会跳过。</p>
        </div>

        <div className="creation-seed-grid">
          {form.characterSeeds.map((character, index) => (
            <article key={index} className="seed-card">
              <div className="seed-card-header">
                <strong>人物 {index + 1}</strong>
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
