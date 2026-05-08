import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAssistRequestBody,
  buildChapterAuditInstruction,
  ChapterComposer,
  formatLastSavedAtLabel,
  getStyleProfileUiState
} from "@/components/chapter-composer";
import type { ChapterEditorData } from "@/types/domain";

globalThis.React = React;

type ParsedElement = {
  attributes: Record<string, string>;
  html: string;
  text: string;
};

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseAttributes(rawAttributes: string): Record<string, string> {
  return Object.fromEntries(
    Array.from(rawAttributes.matchAll(/([^\s=]+)="([^"]*)"/g)).map((match) => [match[1], match[2]])
  );
}

function parseElements(markup: string, tagName: string): ParsedElement[] {
  const pattern = new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, "g");

  return Array.from(markup.matchAll(pattern)).map((match) => ({
    attributes: parseAttributes(match[1]),
    html: match[2],
    text: normalizeWhitespace(stripTags(match[2]))
  }));
}

class FakeEvent {
  type: string;
  bubbles: boolean;
  cancelBubble = false;
  defaultPrevented = false;
  target: FakeNode | null = null;
  currentTarget: FakeNode | null = null;

  constructor(type: string, init?: { bubbles?: boolean }) {
    this.type = type;
    this.bubbles = init?.bubbles ?? true;
  }

  stopPropagation() {
    this.cancelBubble = true;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }
}

class FakeNode {
  nodeType: number;
  ownerDocument: FakeDocument;
  parentNode: FakeNode | null = null;
  childNodes: FakeNode[] = [];
  listeners = new Map<string, Array<(event: FakeEvent) => void>>();
  nodeName = "";

  constructor(nodeType: number, ownerDocument: FakeDocument) {
    this.nodeType = nodeType;
    this.ownerDocument = ownerDocument;
  }

  appendChild(child: FakeNode) {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }

    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  removeChild(child: FakeNode) {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) {
      this.childNodes.splice(index, 1);
      child.parentNode = null;
    }

    return child;
  }

  insertBefore(child: FakeNode, before: FakeNode | null) {
    if (!before) {
      return this.appendChild(child);
    }

    const index = this.childNodes.indexOf(before);
    if (index < 0) {
      return this.appendChild(child);
    }

    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }

    child.parentNode = this;
    this.childNodes.splice(index, 0, child);
    return child;
  }

  addEventListener(type: string, listener: (event: FakeEvent) => void) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  removeEventListener(type: string, listener: (event: FakeEvent) => void) {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      list.filter((item) => item !== listener)
    );
  }

  dispatchEvent(event: FakeEvent) {
    if (!event.target) {
      event.target = this;
    }

    let current: FakeNode | null = this;
    while (current) {
      const listeners = current.listeners.get(event.type) ?? [];
      for (const listener of listeners) {
        event.currentTarget = current;
        listener.call(current, event);
        if (event.cancelBubble) {
          return !event.defaultPrevented;
        }
      }

      current = event.bubbles ? current.parentNode : null;
    }

    return !event.defaultPrevented;
  }

  get firstChild() {
    return this.childNodes[0] ?? null;
  }

  get textContent() {
    return this.childNodes.map((item) => item.textContent).join("");
  }

  set textContent(value: string) {
    this.childNodes = [new FakeText(value, this.ownerDocument)];
  }
}

class FakeText extends FakeNode {
  nodeValue: string;

  constructor(text: string, ownerDocument: FakeDocument) {
    super(3, ownerDocument);
    this.nodeName = "#text";
    this.nodeValue = text;
  }

  override get textContent() {
    return this.nodeValue;
  }

  override set textContent(value: string) {
    this.nodeValue = value;
  }
}

class FakeElement extends FakeNode {
  tagName: string;
  namespaceURI = "http://www.w3.org/1999/xhtml";
  attributes: Record<string, string> = {};
  style: Record<string, string> = {};
  value = "";

  constructor(tagName: string, ownerDocument: FakeDocument) {
    super(1, ownerDocument);
    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = String(value);
    if (name === "value") {
      this.value = String(value);
    }
  }

  removeAttribute(name: string) {
    delete this.attributes[name];
  }

  getAttribute(name: string) {
    return this.attributes[name] ?? null;
  }

  get options() {
    return this.childNodes.filter((item): item is FakeElement => item instanceof FakeElement);
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }
}

class FakeDocument extends FakeNode {
  documentElement: FakeElement;
  body: FakeElement;
  defaultView: Window | null = null;
  activeElement: FakeElement;

  constructor() {
    super(9, null as unknown as FakeDocument);
    this.ownerDocument = this;
    this.nodeName = "#document";
    this.documentElement = new FakeElement("html", this);
    this.body = new FakeElement("body", this);
    this.activeElement = this.body;
    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.body);
  }

  createElement(tagName: string) {
    return new FakeElement(tagName, this);
  }

  createTextNode(text: string) {
    return new FakeText(text, this);
  }
}

async function withMockWindow<T>(windowValue: Window | undefined, run: () => Promise<T> | T) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const globalWithOptionalWindow = globalThis as typeof globalThis & { window?: Window };

  if (windowValue === undefined) {
    Reflect.deleteProperty(globalWithOptionalWindow, "window");
  } else {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: windowValue
    });
  }

  try {
    return await run();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "window", originalDescriptor);
    } else {
      Reflect.deleteProperty(globalWithOptionalWindow, "window");
    }
  }
}

type InteractiveRender = {
  container: FakeElement;
  editor: FakeElement;
  titleInput: FakeElement;
  saveButton: FakeElement;
  getText: () => string;
  findButtonByText: (text: string) => FakeElement;
  findLinkByText: (text: string) => FakeElement;
};

type MockStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type InteractiveComposerOptions = {
  data?: ChapterEditorData;
  fetchImpl?: typeof fetch;
  chapterSlug?: string;
  localStorage?: MockStorage;
  location?: {
    assign: (url: string) => void;
  };
  novelSlug?: string;
};

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return {
    promise,
    resolve,
    reject
  };
}

function findElement(root: FakeNode, predicate: (node: FakeElement) => boolean): FakeElement | null {
  if (root instanceof FakeElement && predicate(root)) {
    return root;
  }

  for (const child of root.childNodes) {
    const result = findElement(child, predicate);
    if (result) {
      return result;
    }
  }

  return null;
}

async function withInteractiveComposer<T>(
  options: InteractiveComposerOptions,
  run: (view: InteractiveRender) => Promise<T> | T
) {
  const data = options.data ?? chapterData;
  const novelSlug = options.novelSlug ?? "mist-harbor";
  const chapterSlug = options.chapterSlug ?? "bell-before-dawn";
  const document = new FakeDocument();
  const localStorage = options.localStorage ?? {
    getItem: () => null,
    setItem: () => undefined
  };
  const location = options.location ?? {
    assign: () => undefined
  };
  const windowValue = {
    document,
    navigator: { userAgent: "node" },
    localStorage,
    location,
    HTMLElement: FakeElement,
    HTMLInputElement: FakeElement,
    HTMLTextAreaElement: FakeElement,
    HTMLIFrameElement: FakeElement,
    SVGElement: FakeElement,
    Element: FakeElement,
    Node: FakeNode,
    Text: FakeText,
    Event: FakeEvent,
    MouseEvent: FakeEvent
  } as unknown as Window;

  document.defaultView = windowValue;

  return withMockWindow(windowValue, async () => {
    const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
    const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    const originalHTMLElement = globalThis.HTMLElement;
    const originalHTMLInputElement = globalThis.HTMLInputElement;
    const originalHTMLTextAreaElement = globalThis.HTMLTextAreaElement;
    const originalHTMLIFrameElement = globalThis.HTMLIFrameElement;
    const originalSVGElement = globalThis.SVGElement;
    const originalElement = globalThis.Element;
    const originalNode = globalThis.Node;
    const originalText = globalThis.Text;
    const originalEvent = globalThis.Event;
    const originalMouseEvent = globalThis.MouseEvent;
    const originalFetch = globalThis.fetch;
    const originalAct = (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      writable: true,
      value: document
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      writable: true,
      value: windowValue.navigator
    });
    Object.assign(globalThis, {
      HTMLElement: FakeElement,
      HTMLInputElement: FakeElement,
      HTMLTextAreaElement: FakeElement,
      HTMLIFrameElement: FakeElement,
      SVGElement: FakeElement,
      Element: FakeElement,
      Node: FakeNode,
      Text: FakeText,
      Event: FakeEvent,
      MouseEvent: FakeEvent,
      fetch: options.fetchImpl,
      IS_REACT_ACT_ENVIRONMENT: true
    });

    try {
      const { createRoot } = await import("react-dom/client");
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container as unknown as Element);

      await React.act(async () => {
        root.render(<ChapterComposer novelSlug={novelSlug} chapterSlug={chapterSlug} data={data} />);
      });

      const editor = findElement(container, (node) => node.tagName === "TEXTAREA" && node.attributes.class === "editor-textarea");
      const titleInput = findElement(
        container,
        (node) => node.tagName === "INPUT" && node.attributes.class === "text-input chapter-title-input"
      );
      const saveButton = findElement(container, (node) => node.tagName === "BUTTON" && node.textContent === "立即保存");

      if (!editor || !titleInput || !saveButton) {
        throw new Error("interactive test harness could not find the title input, editor, or save button");
      }

      const findButtonByText = (text: string) => {
        const result = findElement(container, (node) => node.tagName === "BUTTON" && node.textContent === text);

        if (!result) {
          throw new Error(`button not found: ${text}`);
        }

        return result;
      };

      const findLinkByText = (text: string) => {
        const result = findElement(container, (node) => node.tagName === "A" && node.textContent.includes(text));

        if (!result) {
          throw new Error(`link not found: ${text}`);
        }

        return result;
      };

      return await run({
        container,
        editor,
        titleInput,
        saveButton,
        getText: () => normalizeWhitespace(container.textContent),
        findButtonByText,
        findLinkByText
      } satisfies InteractiveRender);
    } finally {
      if (originalDocumentDescriptor) {
        Object.defineProperty(globalThis, "document", originalDocumentDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "document");
      }
      if (originalNavigatorDescriptor) {
        Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "navigator");
      }
      Object.assign(globalThis, {
        HTMLElement: originalHTMLElement,
        HTMLInputElement: originalHTMLInputElement,
        HTMLTextAreaElement: originalHTMLTextAreaElement,
        HTMLIFrameElement: originalHTMLIFrameElement,
        SVGElement: originalSVGElement,
        Element: originalElement,
        Node: originalNode,
        Text: originalText,
        Event: originalEvent,
        MouseEvent: originalMouseEvent,
        fetch: originalFetch,
        IS_REACT_ACT_ENVIRONMENT: originalAct
      });
    }
  });
}

const chapterData: ChapterEditorData = {
  novel: {
    id: "novel-1",
    slug: "mist-harbor",
    title: "雾港航线",
    premise: "失踪灯塔重新亮起。",
    genre: "海洋悬疑",
    status: "DRAFTING",
    updatedAt: "2026-04-26T00:00:00.000Z",
    chapterCount: 14,
    wordCount: 68000
  },
  voiceRules: ["克制", "留白"],
  styleProfile: {
    id: "profile-1",
    styleSummary: "冷感贴身视角",
    styleRules: ["动作先于解释"],
    avoidRules: ["不要抒情过满"],
    dialogueRules: ["对白留白"],
    narrationRules: ["镜头贴近身体"],
    rhythmRules: ["短段落"],
    imageryRules: ["潮气与金属感"],
    status: "READY",
    lastGeneratedAt: "2026-04-26T03:00:00.000Z"
  },
  chapter: {
    id: "chapter-1",
    slug: "bell-before-dawn",
    title: "第三声钟响前",
    sceneGoal: "让主角意识到危险",
    order: 3,
    status: "DRAFT",
    wordCount: 1800,
    updatedAt: "2026-04-26T04:00:00.000Z",
    content: "海风卷进钟楼。"
  },
  chapters: [
    {
      id: "chapter-1",
      slug: "bell-before-dawn",
      title: "第三声钟响前",
      sceneGoal: "让主角意识到危险",
      order: 3,
      status: "DRAFT",
      wordCount: 1800,
      excerpt: "海风卷进钟楼。"
    },
    {
      id: "chapter-2",
      slug: "tide-mark",
      title: "潮痕未退",
      order: 4,
      status: "DRAFT",
      wordCount: 2100,
      excerpt: "潮水退后，石阶上留下一道发白的印子。"
    }
  ],
  versions: [
    {
      id: "version-2",
      source: "manual",
      createdAt: "2026-04-26T04:00:00.000Z",
      wordCount: 1800
    },
    {
      id: "version-1",
      source: "autosave",
      createdAt: "2026-04-26T03:30:00.000Z",
      wordCount: 1720
    }
  ],
  entities: [
    {
      id: "entity-1",
      type: "CHARACTER",
      name: "沈砚",
      summary: "守钟人",
      tags: []
    }
  ],
  relevantOutlines: [],
  memory: {
    previousChapterCount: 2,
    storySoFar: [
      "第1章《潮湿来信》：沈砚收到匿名来信。",
      "第2章《旧港图》：老齐指出废栈桥的印记。"
    ],
    activeStoryLines: ["主线：潮汐钟失准：钟声失准会影响港城记忆。"],
    openThreads: ["匿名来信 -> 信的真正收件人还没揭开。"],
    keyEntities: ["沈砚：守钟人学徒"],
    currentFocus: "让主角意识到危险"
  },
  foreshadows: [
    {
      id: "foreshadow-1",
      hook: "匿名来信",
      status: "OPEN"
    }
  ],
  auditHistory: [
    {
      id: "audit-1",
      createdAt: "2026-04-26T05:30:00.000Z",
      summary: "整体顺，但老齐这段解释还是偏满。",
      primaryTitle: "本章总体判断",
      primaryText: "前半段有悬念，后半段解释可以再收一点。",
      warnings: ["老齐这一段说得太透。"],
      nextContext: ["把解释拆成动作和停顿。"],
      resolvedProvider: "dmx",
      resolvedModel: "mimo-v2.5-free",
      usedFallback: false
    }
  ]
};

describe("ChapterComposer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the model selector with the default auto option visible", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
    );
    const selects = parseElements(markup, "select");
    const modelSelect = selects.find((element) => element.attributes.name === "modelSelection");
    const modelOptions = modelSelect ? parseElements(modelSelect.html, "option") : [];
    const selectedOption = modelOptions.find((element) => "selected" in element.attributes);

    expect(modelSelect).toBeDefined();
    expect(modelSelect?.text).toContain("自动");
    expect(selectedOption?.attributes.value).toBe("auto");
    expect(selectedOption?.text).toBe("自动");
  });

  it("lists all supported model selection options", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
    );
    const selects = parseElements(markup, "select");
    const modelSelect = selects.find((element) => element.attributes.name === "modelSelection");
    const options = modelSelect ? parseElements(modelSelect.html, "option").map((element) => element.text) : [];

    expect(modelSelect).toBeDefined();
    expect(options).toEqual(["自动", "Kimi", "GLM", "Mimo", "MiniMax", "Qwen", "DeepSeek", "系统兜底"]);
  });

  it("shows only four primary writing actions before the more-help section", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
    );
    const text = normalizeWhitespace(stripTags(markup));
    const primaryActionBlock = markup.slice(
      markup.indexOf("常用动作"),
      markup.indexOf("更多帮助")
    );

    expect(text).toContain("常用动作");
    expect(text).toContain("更多帮助");
    expect(primaryActionBlock).toContain("整理本章要写什么");
    expect(primaryActionBlock).toContain("去掉 AI 味");
    expect(primaryActionBlock).toContain("继续写一小段");
    expect(primaryActionBlock).toContain("帮我改顺改好");
    expect(primaryActionBlock).not.toContain("帮我想清楚怎么写");
    expect(primaryActionBlock).not.toContain("整理设定和资料");
    expect(primaryActionBlock).not.toContain("规划整本书");
    expect(primaryActionBlock).not.toContain("拆章节大纲");
    expect(text).toContain("怎么用 AI 更省事");
    expect(text).toContain("普通任务先用轻一点的模型，真的复杂了再切高配。");
    expect(text).toContain("AI 生成的内容先当草稿看，确认能用再正式采纳。");
  });

  it("shows a lightweight style-profile hint with style constraints enabled by default", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
    );
    const buttons = parseElements(markup, "button");
    const enabledButton = buttons.find((element) => element.text === "按本书语气来写");
    const disabledButton = buttons.find((element) => element.text === "这次先不套用本书语气");

    expect(normalizeWhitespace(stripTags(markup))).toContain("按本书语气来写");
    expect(normalizeWhitespace(stripTags(markup))).toContain("这次先不套用本书语气");
    expect(enabledButton?.attributes["aria-pressed"]).toBe("true");
    expect(disabledButton?.attributes["aria-pressed"]).toBe("false");
  });

  it("shows a compact previous-story memory panel", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
    );
    const text = normalizeWhitespace(stripTags(markup));

    expect(text).toContain("前文记忆");
    expect(text).toContain("已写 2 章");
    expect(text).toContain("沈砚收到匿名来信");
    expect(text).toContain("主线：潮汐钟失准");
    expect(text).toContain("匿名来信 -&gt; 信的真正收件人还没揭开。");
  });

  it("shows a three-column writing workspace with chapter navigation and real top toolbar buttons", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
    );
    const text = normalizeWhitespace(stripTags(markup));

    expect(markup).toContain("chapter-editor-sidebar");
    expect(markup).toContain("chapter-editor-main");
    expect(markup).toContain("chapter-editor-aside");
    expect(text).toContain("章节目录");
    expect(text).toContain("新建章节");
    expect(text).toContain("随时切到别章。");
    expect(text).toContain("收起章节栏");
    expect(text).toContain("第三声钟响前");
    expect(text).toContain("潮痕未退");
    expect(text).toContain("立即保存");
    expect(text).toContain("保存并审核本章");
    expect(text).toContain("查看版本变化");
    expect(text).toContain("查看相关设定");
    expect(text).toContain("先写正文就行。卡住了，再用右边这些辅助功能。");
    expect(text).toContain("点一次右边按钮，这里就会出现候选稿。");
    expect(markup).toContain('class="text-input chapter-title-input"');
    expect(markup).toContain('value="第三声钟响前"');
  });

  it("shows a dedicated chapter audit desk with clear check targets", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
    );
    const text = normalizeWhitespace(stripTags(markup));

    expect(text).toContain("章节审核台");
    expect(text).toContain("前后连贯");
    expect(text).toContain("人物和设定");
    expect(text).toContain("伏笔和剧情线");
    expect(text).toContain("AI 味和句子");
    expect(text).toContain("保存并审核本章");
  });

  it("shows recent saved audit records in the audit desk", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
    );
    const text = normalizeWhitespace(stripTags(markup));

    expect(text).toContain("最近审核记录");
    expect(text).toContain("整体顺，但老齐这段解释还是偏满。");
    expect(text).toContain("老齐这一段说得太透。");
    expect(text).toContain("把解释拆成动作和停顿。");
  });

  it("shows saved status by default", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
    );
    const text = normalizeWhitespace(stripTags(markup));

    expect(text).toContain("已保存");
  });

  it("formats recent save timestamps with today, yesterday, and short chinese dates", () => {
    const now = new Date("2026-04-26T10:30:00");

    expect(formatLastSavedAtLabel("2026-04-26T04:00:00", now)).toBe("今天 04:00");
    expect(formatLastSavedAtLabel("2026-04-25T23:50:00", now)).toBe("昨天 23:50");
    expect(formatLastSavedAtLabel("2026-04-20T08:05:00", now)).toBe("4月20日 08:05");
    expect(formatLastSavedAtLabel("2025-12-31T22:40:00", now)).toBe("2025年12月31日 22:40");
  });

  it("shows 未保存改动 after editing, then autosaves and returns to 已保存", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          chapter: {
            title: "钟楼风声",
            slug: "bell-before-dawn",
            wordCount: 23,
            updatedAt: "2026-04-29T10:00:00.000Z"
          },
          version: null
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    await withInteractiveComposer({ fetchImpl: fetchMock }, async (view) => {
      await React.act(async () => {
        view.editor.value = "海风卷进钟楼，钟索在掌心里勒出了一道红印。";
        view.editor.dispatchEvent(new FakeEvent("input"));
      });
      expect(view.getText()).toContain("有未保存改动");
      expect(fetchMock).not.toHaveBeenCalled();

      await React.act(async () => {
        vi.advanceTimersByTime(1200);
      });
      expect(view.getText()).toContain("已保存");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenLastCalledWith("/api/novels/mist-harbor/chapters/bell-before-dawn", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "第三声钟响前",
          plainText: "海风卷进钟楼，钟索在掌心里勒出了一道红印。",
          source: "autosave",
          expectedUpdatedAt: "2026-04-26T04:00:00.000Z"
        })
      });
    });
  });

  it("saves an edited title and updates the visible chapter labels", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          chapter: {
            title: "钟楼回声",
            slug: "bell-before-dawn",
            wordCount: 1800,
            updatedAt: "2026-04-29T10:03:00.000Z"
          },
          version: {
            id: "version-3",
            source: "manual",
            createdAt: "2026-04-29T10:03:00.000Z",
            wordCount: 1800
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    await withInteractiveComposer({ fetchImpl: fetchMock }, async (view) => {
      await React.act(async () => {
        view.titleInput.value = "  钟楼回声  ";
        view.titleInput.dispatchEvent(new FakeEvent("input"));
      });

      expect(view.getText()).toContain("有未保存改动");

      await React.act(async () => {
        view.saveButton.dispatchEvent(new FakeEvent("click"));
      });

      expect(fetchMock).toHaveBeenLastCalledWith("/api/novels/mist-harbor/chapters/bell-before-dawn", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "  钟楼回声  ",
          plainText: "海风卷进钟楼。",
          source: "manual",
          expectedUpdatedAt: "2026-04-26T04:00:00.000Z"
        })
      });
      expect(view.getText()).toContain("钟楼回声");
      expect(view.getText()).not.toContain("第三声钟响前");
    });
  });

  it("keeps newer dirty content dirty when an older autosave resolves later", async () => {
    const firstSave = createDeferred<Response>();
    const secondSave = createDeferred<Response>();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(() => firstSave.promise)
      .mockImplementationOnce(() =>
        secondSave.promise.then(
          () =>
            new Response(
              JSON.stringify({
                chapter: {
                  title: "第三声钟响前",
                  slug: "bell-before-dawn",
                  wordCount: 24,
                  updatedAt: "2026-04-29T10:01:00.000Z"
                },
                version: null
              }),
              {
                status: 200,
                headers: {
                  "Content-Type": "application/json"
                }
              }
            )
        )
      );

    await withInteractiveComposer({ fetchImpl: fetchMock }, async (view) => {
      await React.act(async () => {
        view.editor.value = "海风卷进钟楼，旧钟还没响。";
        view.editor.dispatchEvent(new FakeEvent("input"));
      });
      expect(view.getText()).toContain("有未保存改动");

      await React.act(async () => {
        vi.advanceTimersByTime(1200);
      });

      expect(view.getText()).toContain("保存中");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/novels/mist-harbor/chapters/bell-before-dawn", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "第三声钟响前",
          plainText: "海风卷进钟楼，旧钟还没响。",
          source: "autosave",
          expectedUpdatedAt: "2026-04-26T04:00:00.000Z"
        })
      });

      await React.act(async () => {
        view.editor.value = "海风卷进钟楼，旧钟还没响，她先攥紧了绳结。";
        view.editor.dispatchEvent(new FakeEvent("input"));
      });

      firstSave.resolve(
        new Response(
          JSON.stringify({
            chapter: {
              title: "第三声钟响前",
              slug: "bell-before-dawn",
              wordCount: 16,
              updatedAt: "2026-04-29T10:00:00.000Z"
            },
            version: null
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      );

      await React.act(async () => {
        await firstSave.promise;
      });
      expect(view.getText()).toContain("有未保存改动");

      await React.act(async () => {
        vi.advanceTimersByTime(1200);
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/novels/mist-harbor/chapters/bell-before-dawn", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "第三声钟响前",
          plainText: "海风卷进钟楼，旧钟还没响，她先攥紧了绳结。",
          source: "autosave",
          expectedUpdatedAt: "2026-04-29T10:00:00.000Z"
        })
      });

      secondSave.resolve(
        new Response(
          JSON.stringify({
            chapter: {
              title: "第三声钟响前",
              slug: "bell-before-dawn",
              wordCount: 24,
              updatedAt: "2026-04-29T10:01:00.000Z"
            },
            version: null
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      );

      await React.act(async () => {
        await secondSave.promise;
      });
      expect(view.getText()).toContain("已保存");
    });
  });

  it("uses a client effect for remembered sidebar state so the first render stays SSR-safe", async () => {
    const markup = await withMockWindow(
      {
        localStorage: {
          getItem: () => "true",
          setItem: () => undefined
        }
      } as unknown as Window,
      () =>
        renderToStaticMarkup(
          <ChapterComposer novelSlug="mist-harbor" chapterSlug="bell-before-dawn" data={chapterData} />
        )
    );
    const text = normalizeWhitespace(stripTags(markup));

    expect(markup).not.toContain("chapter-editor-sidebar-collapsed");
    expect(text).toContain("收起章节栏");
    expect(text).toContain("新建章节");
    expect(text).toContain("章节目录");
  });

  it("reads remembered sidebar state after mount and collapses safely", async () => {
    await withInteractiveComposer(
      {
        localStorage: {
          getItem: () => "true",
          setItem: () => undefined
        }
      },
      async (view) => {
        expect(view.container.textContent).toContain("展开章节栏");
        expect(view.container.textContent).not.toContain("新建章节");
      }
    );
  });

  it("calls manual save with source=manual and refreshes the saved status", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          chapter: {
            title: "第三声钟响前",
            slug: "bell-before-dawn",
            wordCount: 27,
            updatedAt: "2026-04-29T10:02:00.000Z"
          },
          version: {
            id: "version-3",
            source: "manual",
            createdAt: "2026-04-29T10:02:00.000Z",
            wordCount: 27
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    await withInteractiveComposer({ fetchImpl: fetchMock }, async (view) => {
      await React.act(async () => {
        view.editor.value = "海风卷进钟楼，她先把灯绳绕在腕上。";
        view.editor.dispatchEvent(new FakeEvent("input"));
      });
      expect(view.getText()).toContain("有未保存改动");

      await React.act(async () => {
        view.saveButton.dispatchEvent(new FakeEvent("click"));
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenLastCalledWith("/api/novels/mist-harbor/chapters/bell-before-dawn", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "第三声钟响前",
          plainText: "海风卷进钟楼，她先把灯绳绕在腕上。",
          source: "manual",
          expectedUpdatedAt: "2026-04-26T04:00:00.000Z"
        })
      });
      expect(view.getText()).toContain("已保存");
    });
  });

  it("deduplicates rapid double clicks on manual save so only one manual PATCH is sent", async () => {
    const firstSave = createDeferred<Response>();
    const fetchMock = vi.fn<typeof fetch>().mockImplementationOnce(() => firstSave.promise);

    await withInteractiveComposer({ fetchImpl: fetchMock }, async (view) => {
      await React.act(async () => {
        view.editor.value = "海风卷进钟楼，她先把灯绳压在掌心里。";
        view.editor.dispatchEvent(new FakeEvent("input"));
      });

      await React.act(async () => {
        view.saveButton.dispatchEvent(new FakeEvent("click"));
        view.saveButton.dispatchEvent(new FakeEvent("click"));
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/novels/mist-harbor/chapters/bell-before-dawn", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "第三声钟响前",
          plainText: "海风卷进钟楼，她先把灯绳压在掌心里。",
          source: "manual",
          expectedUpdatedAt: "2026-04-26T04:00:00.000Z"
        })
      });

      firstSave.resolve(
        new Response(
          JSON.stringify({
            chapter: {
              title: "第三声钟响前",
              slug: "bell-before-dawn",
              wordCount: 18,
              updatedAt: "2026-04-29T10:06:00.000Z"
            },
            version: {
              id: "version-4",
              source: "manual",
              createdAt: "2026-04-29T10:06:00.000Z",
              wordCount: 18
            }
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      );

      await React.act(async () => {
        await firstSave.promise;
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(view.getText()).toContain("已保存");
    });
  });

  it("does not send another manual save when the draft already matches the latest saved content", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    await withInteractiveComposer({ fetchImpl: fetchMock }, async (view) => {
      await React.act(async () => {
        view.saveButton.dispatchEvent(new FakeEvent("click"));
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(view.getText()).toContain("已保存");
    });
  });

  it("tries autosave before switching chapters and then navigates inside the writing flow", async () => {
    const assign = vi.fn();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          chapter: {
            title: "第三声钟响前",
            slug: "bell-before-dawn",
            wordCount: 28,
            updatedAt: "2026-04-29T10:03:00.000Z"
          },
          version: null
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      )
    );

    await withInteractiveComposer(
      {
        fetchImpl: fetchMock,
        location: {
          assign
        }
      },
      async (view) => {
        await React.act(async () => {
          view.editor.value = "海风卷进钟楼，她先把灯绳绕在腕上，又侧耳听了听。";
          view.editor.dispatchEvent(new FakeEvent("input"));
        });

        await React.act(async () => {
          view.findLinkByText("潮痕未退").dispatchEvent(new FakeEvent("click"));
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenLastCalledWith("/api/novels/mist-harbor/chapters/bell-before-dawn", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: "第三声钟响前",
            plainText: "海风卷进钟楼，她先把灯绳绕在腕上，又侧耳听了听。",
            source: "autosave",
            expectedUpdatedAt: "2026-04-26T04:00:00.000Z"
          })
        });
        expect(assign).toHaveBeenCalledWith("/novels/mist-harbor/chapters/tide-mark");
      }
    );
  });

  it("ignores a second create click while a dirty draft is being autosaved for chapter creation", async () => {
    const autosave = createDeferred<Response>();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(() => autosave.promise)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            chapter: {
              slug: "chapter-5",
              title: "第 5 章",
              order: 5
            }
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      );

    await withInteractiveComposer({ fetchImpl: fetchMock }, async (view) => {
      await React.act(async () => {
        view.editor.value = "海风卷进钟楼，她先把门栓扣紧。";
        view.editor.dispatchEvent(new FakeEvent("input"));
      });

      await React.act(async () => {
        view.findButtonByText("新建章节").dispatchEvent(new FakeEvent("click"));
        view.findButtonByText("新建章节").dispatchEvent(new FakeEvent("click"));
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/novels/mist-harbor/chapters/bell-before-dawn", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "第三声钟响前",
          plainText: "海风卷进钟楼，她先把门栓扣紧。",
          source: "autosave",
          expectedUpdatedAt: "2026-04-26T04:00:00.000Z"
        })
      });

      autosave.resolve(
        new Response(
          JSON.stringify({
            chapter: {
              title: "第三声钟响前",
              slug: "bell-before-dawn",
              wordCount: 19,
              updatedAt: "2026-04-29T10:03:30.000Z"
            },
            version: null
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      );

      await React.act(async () => {
        await autosave.promise;
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/novels/mist-harbor/chapters", {
        method: "POST"
      });
    });
  });

  it("creates a new chapter and jumps to the new writing page", async () => {
    const assign = vi.fn();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            chapter: {
              slug: "chapter-5",
              title: "第 5 章",
              order: 5
            }
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      );

    await withInteractiveComposer(
      {
        fetchImpl: fetchMock,
        location: {
          assign
        }
      },
      async (view) => {
        await React.act(async () => {
          view.findButtonByText("新建章节").dispatchEvent(new FakeEvent("click"));
        });

        expect(fetchMock).toHaveBeenCalledWith("/api/novels/mist-harbor/chapters", {
          method: "POST"
        });
        expect(assign).toHaveBeenCalledWith("/novels/mist-harbor/chapters/chapter-5");
      }
    );
  });

  it("keeps save and create clickable in demo mode, but explains why write actions are unavailable", async () => {
    await withInteractiveComposer(
      {
        data: {
          ...chapterData,
          source: "demo"
        }
      },
      async (view) => {
        expect(view.getText()).toContain("当前是示例章节，可以先体验流程。");
        expect(view.getText()).toContain("正式保存和新建章节，需要进入真实作品。");

        await React.act(async () => {
          view.saveButton.dispatchEvent(new FakeEvent("click"));
          view.findButtonByText("新建章节").dispatchEvent(new FakeEvent("click"));
        });

        expect("disabled" in view.saveButton.attributes).toBe(false);
        expect("disabled" in view.findButtonByText("新建章节").attributes).toBe(false);
        expect(view.getText()).toContain("当前是演示章节，数据库恢复后才能正式保存。");
        expect(view.getText()).toContain("当前是演示章节，数据库恢复后才能新建章节。");
      }
    );
  });

  it("shows a chapter-creation error without polluting save state, and autosave still works afterwards", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "创建章节失败"
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            chapter: {
              title: "第三声钟响前",
              slug: "bell-before-dawn",
              wordCount: 26,
              updatedAt: "2026-04-29T10:04:00.000Z"
            },
            version: null
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      );

    await withInteractiveComposer({ fetchImpl: fetchMock }, async (view) => {
      await React.act(async () => {
        view.findButtonByText("新建章节").dispatchEvent(new FakeEvent("click"));
      });

      expect(view.getText()).toContain("新建章节失败，请稍后再试。");
      expect(view.getText()).not.toContain("保存失败");
      expect(view.getText()).toContain("已保存");

      await React.act(async () => {
        view.editor.value = "海风卷进钟楼，她把灯绳又在手背上绕了一圈。";
        view.editor.dispatchEvent(new FakeEvent("input"));
      });

      expect(view.getText()).toContain("有未保存改动");

      await React.act(async () => {
        vi.advanceTimersByTime(1200);
      });

      expect(fetchMock).toHaveBeenLastCalledWith("/api/novels/mist-harbor/chapters/bell-before-dawn", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "第三声钟响前",
          plainText: "海风卷进钟楼，她把灯绳又在手背上绕了一圈。",
          source: "autosave",
          expectedUpdatedAt: "2026-04-26T04:00:00.000Z"
        })
      });
      expect(view.getText()).toContain("已保存");
      expect(view.getText()).not.toContain("保存失败");
    });
  });

  it("keeps only the first chapter switch request while a dirty draft save is in flight", async () => {
    const assign = vi.fn();
    const autosave = createDeferred<Response>();
    const fetchMock = vi.fn<typeof fetch>().mockImplementationOnce(() => autosave.promise);

    await withInteractiveComposer(
      {
        fetchImpl: fetchMock,
        location: {
          assign
        },
        data: {
          ...chapterData,
          chapters: [
            ...chapterData.chapters,
            {
              id: "chapter-3",
              slug: "glass-hall",
              title: "玻璃回廊",
              order: 5,
              status: "DRAFT",
              wordCount: 2400,
              excerpt: "走廊比雨声更先发出回音。"
            }
          ]
        }
      },
      async (view) => {
        await React.act(async () => {
          view.editor.value = "海风卷进钟楼，她先听见了楼梯上的回音。";
          view.editor.dispatchEvent(new FakeEvent("input"));
        });

        await React.act(async () => {
          view.findLinkByText("潮痕未退").dispatchEvent(new FakeEvent("click"));
          view.findLinkByText("玻璃回廊").dispatchEvent(new FakeEvent("click"));
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(assign).not.toHaveBeenCalled();

        autosave.resolve(
          new Response(
            JSON.stringify({
              chapter: {
                title: "第三声钟响前",
                slug: "bell-before-dawn",
                wordCount: 21,
                updatedAt: "2026-04-29T10:05:00.000Z"
              },
              version: null
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json"
              }
            }
          )
        );

        await React.act(async () => {
          await autosave.promise;
        });

        expect(assign).toHaveBeenCalledTimes(1);
        expect(assign).toHaveBeenCalledWith("/novels/mist-harbor/chapters/tide-mark");
      }
    );
  });

  it("opens a lightweight diff dialog against the latest saved baseline", async () => {
    await withInteractiveComposer({ fetchImpl: vi.fn() }, async (view) => {
      await React.act(async () => {
        view.editor.value = "海风卷进钟楼，她摸到钟索上的盐霜。";
        view.editor.dispatchEvent(new FakeEvent("input"));
      });

      await React.act(async () => {
        view.findButtonByText("查看版本变化").dispatchEvent(new FakeEvent("click"));
      });

      const text = view.getText();
      expect(text).toContain("改动对比");
      expect(text).toContain("最近保存内容");
      expect(text).toContain("当前草稿");
      expect(text).toContain("海风卷进钟楼。");
      expect(text).toContain("海风卷进钟楼，她摸到钟索上的盐霜。");
    });
  });

  it("explains the diff baseline in plain language when there is no manual version yet", async () => {
    await withInteractiveComposer(
      {
        fetchImpl: vi.fn(),
        data: {
          ...chapterData,
          versions: [
            {
              id: "version-1",
              source: "autosave",
              createdAt: "2026-04-26T03:30:00.000Z",
              wordCount: 1720
            }
          ]
        }
      },
      async (view) => {
        await React.act(async () => {
          view.findButtonByText("查看版本变化").dispatchEvent(new FakeEvent("click"));
        });

        expect(view.getText()).toContain("还没有手动保存版本");
      }
    );
  });

  it("opens a lightweight related-context dialog with人物、伏笔和相关大纲", async () => {
    await withInteractiveComposer(
      {
        fetchImpl: vi.fn(),
        data: {
          ...chapterData,
          relevantOutlines: [
            {
              id: "outline-1",
              title: "钟楼里先听到第二声",
              summary: "让危险比答案更早出现。",
              depth: 1,
              order: 1,
              status: "ACTIVE",
              chapterSlug: "bell-before-dawn"
            }
          ]
        }
      },
      async (view) => {
        await React.act(async () => {
          view.findButtonByText("查看相关设定").dispatchEvent(new FakeEvent("click"));
        });

        const text = view.getText();
        expect(text).toContain("查看相关设定");
        expect(text).toContain("沈砚");
        expect(text).toContain("匿名来信");
        expect(text).toContain("钟楼里先听到第二声");
      }
    );
  });

  it("shows a lightweight message instead of style toggle when no style profile is available", () => {
    const markup = renderToStaticMarkup(
      <ChapterComposer
        novelSlug="mist-harbor"
        chapterSlug="bell-before-dawn"
        data={{ ...chapterData, styleProfile: undefined }}
      />
    );
    const text = normalizeWhitespace(stripTags(markup));

    expect(text).toContain("这本书还没有可用的文风参考");
    expect(text).not.toContain("按本书语气来写");
    expect(text).not.toContain("这次先不套用本书语气");
  });

  it("returns a mode-specific lightweight message when the current mode does not use style profile", () => {
    expect(getStyleProfileUiState("outline", chapterData.styleProfile)).toEqual({
      kind: "message",
      message: "当前模式暂时不用文风参考"
    });
  });

  it("builds an assist payload with disableStyleProfile when style constraints are turned off", () => {
    expect(
      buildAssistRequestBody({
        novelSlug: "mist-harbor",
        chapterSlug: "bell-before-dawn",
        mode: "rewrite",
        modelSelection: "glm",
        skillPresetId: "voice-keeper",
        disableStyleProfile: true,
        instruction: "改得更克制",
        currentText: "海风卷进钟楼。"
      })
    ).toEqual({
      novelSlug: "mist-harbor",
      chapterSlug: "bell-before-dawn",
      mode: "rewrite",
      modelSelection: "glm",
      skillPresetId: "voice-keeper",
      disableStyleProfile: true,
      instruction: "改得更克制",
      currentText: "海风卷进钟楼。"
    });
  });

  it("builds a plain-Chinese audit instruction for end-of-chapter review", () => {
    const instruction = buildChapterAuditInstruction("让主角意识到危险");

    expect(instruction).toContain("请按章节审核台的方式检查这一章");
    expect(instruction).toContain("前后连贯");
    expect(instruction).toContain("人物和设定");
    expect(instruction).toContain("伏笔和剧情线");
    expect(instruction).toContain("AI 味和句子");
    expect(instruction).toContain("让主角意识到危险");
  });

  it("blocks chapter audit when the draft body is blank", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const blankDraftData: ChapterEditorData = {
      ...chapterData,
      chapter: {
        ...chapterData.chapter,
        content: "   ",
        wordCount: 0
      }
    };

    await withInteractiveComposer({ data: blankDraftData, fetchImpl: fetchMock }, async (view) => {
      const auditButton = view.findButtonByText("保存并审核本章");

      expect("disabled" in auditButton.attributes).toBe(true);

      await React.act(async () => {
        auditButton.dispatchEvent(new FakeEvent("click"));
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it("saves then runs a dedicated chapter audit and renders the audit report", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            chapter: {
              title: "第三声钟响前",
              slug: "bell-before-dawn",
              wordCount: 32,
              updatedAt: "2026-04-29T10:07:00.000Z"
            },
            version: {
              id: "version-5",
              source: "manual",
              createdAt: "2026-04-29T10:07:00.000Z",
              wordCount: 32
            }
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            mode: "audit",
            summary: "这一章能看，但有两个地方会让人出戏。",
            primary: {
              title: "本章总体判断",
              text: "前半段紧张感够了，但后半段解释偏多，人物反应也有一点跳。",
              why: "这样会削弱悬念。"
            },
            alternatives: [],
            warnings: ["老齐前一章更克制，这一章解释得太满。", "匿名来信的作用说早了半步。"],
            nextContext: ["把老齐的解释压短。", "让匿名来信先只露一半信息。"],
            meta: {
              requestedModel: "auto",
              resolvedProvider: "dmx",
              resolvedModel: "mimo-v2.5-free",
              usedFallback: false
            }
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
      );

    await withInteractiveComposer({ fetchImpl: fetchMock }, async (view) => {
      await React.act(async () => {
        view.editor.value = "海风卷进钟楼，她先把那封信压回桌面，又去看墙上的旧港图。";
        view.editor.dispatchEvent(new FakeEvent("input"));
      });

      await React.act(async () => {
        view.findButtonByText("保存并审核本章").dispatchEvent(new FakeEvent("click"));
      });

      expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/novels/mist-harbor/chapters/bell-before-dawn", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: "第三声钟响前",
          plainText: "海风卷进钟楼，她先把那封信压回桌面，又去看墙上的旧港图。",
          source: "manual",
          expectedUpdatedAt: "2026-04-26T04:00:00.000Z"
        })
      });
      expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/ai/assist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          novelSlug: "mist-harbor",
          chapterSlug: "bell-before-dawn",
          mode: "audit",
          modelSelection: "auto",
          disableStyleProfile: false,
          instruction: buildChapterAuditInstruction("让主角意识到危险"),
          currentText: "海风卷进钟楼，她先把那封信压回桌面，又去看墙上的旧港图。"
        })
      });

      const text = view.getText();
      expect(text).toContain("章节审核结果");
      expect(text).toContain("这一章能看，但有两个地方会让人出戏。");
      expect(text).toContain("高风险问题");
      expect(text).toContain("可优化方向");
      expect(text).toContain("老齐前一章更克制");
      expect(text).toContain("把老齐的解释压短");
    });
  });
});
