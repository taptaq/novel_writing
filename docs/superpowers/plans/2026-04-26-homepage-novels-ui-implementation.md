# Homepage And Novels UI Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the `/` and `/novels` pages into concise, user-facing entry points with a cleaner “future editorial” aesthetic and stronger workspace CTAs.

**Architecture:** Keep the implementation localized to the two route files plus shared global styles, and add focused render-to-string tests that lock in the reduced-copy information hierarchy. Reuse the existing page and card patterns where possible, but replace explanation-heavy sections with short status cards, lightweight capability tags, and cleaner project entry cards.

**Tech Stack:** Next.js App Router, React 18 server components, global CSS, Vitest, `react-dom/server`

---

## File Structure

**Modify**
- `src/app/page.tsx`
  - Replace the current explanation-heavy homepage sections with a concise hero, three short status cards, a lightweight capability tag strip, and a stronger recent-project entry section.
- `src/app/novels/page.tsx`
  - Simplify the page header and tighten each project card so it reads like a project/workspace entry point rather than a descriptive content block.
- `src/app/globals.css`
  - Add the new minimalist landing/page-entry styles and reduce the visual weight of panels, copy blocks, and card chrome for the affected routes.

**Create**
- `tests/home-page.test.tsx`
  - Render the async homepage server component to static markup and assert that the new CTA-first, low-copy structure is present.
- `tests/novels-page.test.tsx`
  - Render the async novels index server component to static markup and assert that the simplified page heading and cleaner project metadata are present.

**Current environment note**
- The working directory is not an active git repository, so commit steps are intentionally omitted from this plan until version control is available.

---

### Task 1: Lock In The Simplified Homepage Contract

**Files:**
- Create: `tests/home-page.test.tsx`
- Test: `tests/home-page.test.tsx`

- [ ] **Step 1: Write the failing homepage render test**

```tsx
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { getNovelSummaries } from "@/lib/repositories/novels";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
}));

vi.mock("@/lib/repositories/novels", () => ({
  getNovelSummaries: vi.fn()
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(getNovelSummaries).mockResolvedValue([
      {
        id: "novel-1",
        slug: "tide-and-embers",
        title: "潮与余烬",
        premise: "盐雾港口中的谍报与旧王朝余烬。",
        summary: "盐雾港口中的谍报与旧王朝余烬。",
        genre: "奇幻",
        chapterCount: 12,
        wordCount: 42000,
        status: "连载中"
      }
    ]);
  });

  it("renders a concise hero with strong workspace entry points", async () => {
    const markup = renderToStaticMarkup(await HomePage());

    expect(markup).toContain("AI 协作写作，不替作者做决定");
    expect(markup).toContain("进入示例工作区");
    expect(markup).toContain("查看作品");
    expect(markup).toContain("结构");
    expect(markup).toContain("设定");
    expect(markup).toContain("写作");
    expect(markup).toContain("最近作品");
    expect(markup).not.toContain("框架重点");
    expect(markup).not.toContain("先搭稳的三层");
  });
});
```

- [ ] **Step 2: Run the homepage test to verify it fails**

Run:

```bash
npm run test -- tests/home-page.test.tsx
```

Expected:

```text
FAIL  tests/home-page.test.tsx
+ expected rendered homepage markup to contain "AI 协作写作，不替作者做决定"
```

- [ ] **Step 3: Implement the minimal homepage content rewrite**

Update `src/app/page.tsx` so the page shape matches the simplified contract:

```tsx
import Link from "next/link";
import { getNovelSummaries } from "@/lib/repositories/novels";

const statusCards = [
  {
    title: "结构",
    value: "节拍可追踪",
    detail: "大纲、伏笔、章节推进保持同频。"
  },
  {
    title: "设定",
    value: "实体可统一",
    detail: "人物、地点、规则集中整理。"
  },
  {
    title: "写作",
    value: "上下文可接续",
    detail: "在当前章节里继续写，不丢语气。"
  }
];

const capabilityTags = ["结构建议", "设定映射", "上下文续写", "风格护栏"];

export default async function HomePage() {
  const novels = await getNovelSummaries();
  const featureNovel = novels[0];

  return (
    <div className="landing-stack">
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="panel-eyebrow">Human Draft Studio</p>
          <h1>AI 协作写作，不替作者做决定。</h1>
          <p className="landing-summary">把结构、设定和章节推进收进同一个写作工作台。</p>
          <div className="action-row">
            <Link className="button-primary" href={featureNovel ? `/novels/${featureNovel.slug}` : "/novels"}>
              进入示例工作区
            </Link>
            <Link className="button-secondary" href="/novels">
              查看作品
            </Link>
          </div>
        </div>

        <div className="landing-status-grid">
          {statusCards.map((item) => (
            <article key={item.title} className="landing-status-card">
              <span className="landing-status-label">{item.title}</span>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-capabilities">
        {capabilityTags.map((tag) => (
          <span key={tag} className="landing-capability-tag">
            {tag}
          </span>
        ))}
      </section>

      <section className="panel landing-projects">
        <div className="panel-header">
          <div>
            <p className="panel-eyebrow">最近作品</p>
            <h2>继续推进你的项目</h2>
          </div>
        </div>

        <div className="landing-project-list">
          {novels.map((novel) => (
            <Link key={novel.id} href={`/novels/${novel.slug}`} className="project-entry-card">
              <div>
                <h3>{novel.title}</h3>
                <p>{novel.summary ?? novel.premise}</p>
              </div>
              <div className="stats-inline">
                <span className="stat-pill">{novel.genre ?? "未分类"}</span>
                <span className="stat-pill">{novel.chapterCount} 章</span>
                <span className="stat-pill">{novel.wordCount} 字</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Re-run the homepage test to verify it passes**

Run:

```bash
npm run test -- tests/home-page.test.tsx
```

Expected:

```text
PASS  tests/home-page.test.tsx
✓ renders a concise hero with strong workspace entry points
```

---

### Task 2: Lock In The Simplified Novels Index Contract

**Files:**
- Create: `tests/novels-page.test.tsx`
- Test: `tests/novels-page.test.tsx`

- [ ] **Step 1: Write the failing novels index render test**

```tsx
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NovelsPage from "@/app/novels/page";
import { getNovelSummaries } from "@/lib/repositories/novels";

vi.mock("next/link", () => ({
  default: ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
    <a href={href} className={className}>
      {children}
    </a>
  )
}));

vi.mock("@/lib/repositories/novels", () => ({
  getNovelSummaries: vi.fn()
}));

describe("NovelsPage", () => {
  beforeEach(() => {
    vi.mocked(getNovelSummaries).mockResolvedValue([
      {
        id: "novel-1",
        slug: "tide-and-embers",
        title: "潮与余烬",
        premise: "盐雾港口中的谍报与旧王朝余烬。",
        summary: "盐雾港口中的谍报与旧王朝余烬。",
        genre: "奇幻",
        chapterCount: 12,
        wordCount: 42000,
        status: "连载中"
      }
    ]);
  });

  it("renders a concise project-entry page", async () => {
    const markup = renderToStaticMarkup(await NovelsPage());

    expect(markup).toContain("作品库");
    expect(markup).toContain("选择一个项目继续推进");
    expect(markup).toContain("潮与余烬");
    expect(markup).toContain("奇幻");
    expect(markup).toContain("12 章");
    expect(markup).toContain("42000 字");
    expect(markup).not.toContain("你的小说项目");
  });
});
```

- [ ] **Step 2: Run the novels index test to verify it fails**

Run:

```bash
npm run test -- tests/novels-page.test.tsx
```

Expected:

```text
FAIL  tests/novels-page.test.tsx
+ expected rendered novels page markup to contain "选择一个项目继续推进"
```

- [ ] **Step 3: Implement the minimal novels page content rewrite**

Update `src/app/novels/page.tsx` so the page reads like a clean project entry screen:

```tsx
import Link from "next/link";
import { getNovelSummaries } from "@/lib/repositories/novels";

export default async function NovelsPage() {
  const novels = await getNovelSummaries();

  return (
    <div className="page-stack">
      <section className="panel library-panel">
        <div className="library-header">
          <div>
            <p className="panel-eyebrow">作品库</p>
            <h1>选择一个项目继续推进</h1>
            <p className="library-summary">从最近的小说项目进入结构、设定和章节工作区。</p>
          </div>
        </div>

        <div className="library-list">
          {novels.map((novel) => (
            <Link href={`/novels/${novel.slug}`} key={novel.id} className="project-entry-card">
              <div className="project-entry-copy">
                <h3>{novel.title}</h3>
                <p>{novel.summary ?? novel.premise}</p>
              </div>
              <div className="stats-inline">
                <span className="stat-pill">{novel.genre ?? "未分类"}</span>
                <span className="stat-pill">{novel.chapterCount} 章</span>
                <span className="stat-pill">{novel.wordCount} 字</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Re-run the novels index test to verify it passes**

Run:

```bash
npm run test -- tests/novels-page.test.tsx
```

Expected:

```text
PASS  tests/novels-page.test.tsx
✓ renders a concise project-entry page
```

---

### Task 3: Apply The Shared Minimalist Visual System

**Files:**
- Modify: `src/app/globals.css`
- Test: `tests/home-page.test.tsx`
- Test: `tests/novels-page.test.tsx`

- [ ] **Step 1: Add the minimal landing and library CSS primitives**

Append or replace the relevant route-level styles in `src/app/globals.css` with focused classes for the new UI:

```css
.landing-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.landing-hero,
.library-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(112, 132, 163, 0.16);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(248, 250, 252, 0.82)),
    rgba(255, 255, 255, 0.82);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.landing-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.9fr);
  gap: 20px;
  padding: 28px;
}

.landing-copy h1 {
  max-width: 10ch;
  font-size: clamp(2.4rem, 4vw, 4.2rem);
  line-height: 0.98;
}

.landing-summary,
.library-summary {
  max-width: 34rem;
  margin: 12px 0 0;
  color: #5f6c7b;
  line-height: 1.6;
}

.landing-status-grid {
  display: grid;
  gap: 12px;
}

.landing-status-card,
.project-entry-card {
  border-radius: 18px;
  border: 1px solid rgba(112, 132, 163, 0.16);
  background: rgba(255, 255, 255, 0.78);
}

.landing-status-card {
  padding: 16px;
}

.landing-status-card strong {
  display: block;
  margin: 6px 0 8px;
  font-size: 1.05rem;
}

.landing-status-card p {
  margin: 0;
  color: #5f6c7b;
  line-height: 1.55;
}

.landing-status-label {
  color: #62748a;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.landing-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.landing-capability-tag {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(112, 132, 163, 0.16);
  background: rgba(255, 255, 255, 0.72);
  color: #334155;
}

.landing-projects,
.library-panel {
  padding: 22px;
}

.landing-project-list,
.library-list {
  display: grid;
  gap: 14px;
}

.project-entry-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.project-entry-card:hover {
  transform: translateY(-2px);
  border-color: rgba(20, 92, 88, 0.26);
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.project-entry-copy p {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  color: #5f6c7b;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.library-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

@media (max-width: 900px) {
  .landing-hero {
    grid-template-columns: 1fr;
  }

  .project-entry-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-inline {
    justify-content: flex-start;
  }
}
```

- [ ] **Step 2: Remove or demote the old homepage-heavy card styles from active use**

Update the existing route markup and shared styles so these legacy content patterns are no longer used by `/` and `/novels`:

```tsx
// Remove these homepage structures from src/app/page.tsx:
// - capabilityCards-driven "框架重点" section
// - hero metric cards with long infrastructure copy
// - explanation-heavy row cards used as homepage feature copy
```

```css
/* Keep old classes for untouched workspace pages, but ensure the new homepage
   uses landing-* and project-entry-* classes instead of hero-metrics/info-card-heavy layouts. */
```

- [ ] **Step 3: Run the focused tests to verify the CSS refactor did not break structure**

Run:

```bash
npm run test -- tests/home-page.test.tsx tests/novels-page.test.tsx
```

Expected:

```text
PASS  tests/home-page.test.tsx
PASS  tests/novels-page.test.tsx
```

---

### Task 4: Full Verification And Finish

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/novels/page.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/home-page.test.tsx`
- Test: `tests/novels-page.test.tsx`

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm run test
```

Expected:

```text
PASS  tests/home-page.test.tsx
PASS  tests/novels-page.test.tsx
PASS  existing tests
```

- [ ] **Step 2: Run type-checking**

Run:

```bash
npm run typecheck
```

Expected:

```text
$ tsc --noEmit
```

- [ ] **Step 3: Run a production build verification**

Run:

```bash
npm run build
```

Expected:

```text
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
```

- [ ] **Step 4: Manual review checklist before handoff**

Check the implemented pages against the approved spec:

```text
[ ] Homepage hero shows one short value statement, one short support line, and two CTAs
[ ] Homepage keeps exactly three short status cards
[ ] Homepage capability area uses short tags rather than paragraph cards
[ ] Homepage surfaces recent projects before any long explanation block
[ ] /novels page reads like a project-entry screen, not a descriptive library essay
[ ] Both pages feel visually lighter than the existing paper-heavy design
[ ] Mobile layout stacks the hero and entry cards cleanly
```

---

## Spec Coverage Self-Review

- `首页三段结构` is covered by Task 1 and Task 3.
- `首页首屏简洁 + 三个状态卡 + 两个 CTA` is covered by Task 1.
- `轻量能力标签区` is covered by Task 1 and Task 3.
- `最近作品入口前置` is covered by Task 1.
- `作品入口页简洁页头 + 入口型卡片` is covered by Task 2 and Task 3.
- `视觉收敛、减少纸张感、轻量动效、移动端单列` is covered by Task 3.
- `验证标准` is covered by Task 4.

No open spec gaps remain in this plan.
