import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import { callRoutedJsonModel } from "@/lib/ai/router";
import { isAiConfigured } from "@/lib/env";
import type {
  WritingAssistInput,
  WritingAssistMeta,
  WritingAssistResponse,
  WritingSuggestion
} from "@/lib/ai/types";

function lastMeaningfulLine(input: string) {
  const lines = input
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.at(-1) ?? "主角还没有做出新的动作。";
}

function buildPrimaryText(input: WritingAssistInput) {
  const pivot = lastMeaningfulLine(input.currentText);

  switch (input.mode) {
    case "continue":
      return `${pivot}\n\n沈砚没有立刻拆信。他先把信封翻过来，用指腹按了按纸背起皱的地方。潮气还没散，说明这封信刚离开海边不久。楼外第二声风掠过去时，他把窗闩扣紧，回头看见老齐已经把磨刀石收了起来。\n\n“你要是现在开，”老齐说，“今晚就得出去。”\n\n这句话不像提醒，更像一道已经替他算好的后果。沈砚把信重新压回桌面，没有接话，只是把墙上的旧港图扯了下来。图角卷着，他找了半天，终于在最北侧的废栈桥旁边，看到一个快被水渍吃掉的印记。那印记和信封背面留下的圆弧压痕，大小正好相同。`;
    case "rewrite":
      return `夜风更冷了一点。沈砚还站在梯子上，手背被铜钉边缘磨得发痛。按规矩，报时还没到，可钟腔先震了一下，像有人在里面轻轻推了摆轮。\n\n他低头看海。潮位不高，码头却安静得反常，连铁钩落地都被人压着声。沈砚贴近钟壳，听见第二道极浅的节拍，从旧铜里一下一下透出来。\n\n楼下忽然有人叫他。送信的孩子跑得上气不接下气，怀里抱着一封被海水打湿的信。信封没有名字，只有一句还算清楚的话：别让今晚的第三声钟响下去。`;
    case "outline":
      return `建议把这一段拆成三拍来写。\n\n第一拍：主角先确认异常，不急着解释世界观，只让他通过手感、听觉、现场安静程度确认“今晚不对”。\n\n第二拍：引入来信，但不要立刻说明信的重要性，先让信息不完整。比如只露出一句警告，或者露出一个与旧城有关的印记。\n\n第三拍：用师父的一句短话把风险抬高，让主角不得不在“继续装作没看见”和“出去查”之间选一个。`;
    case "audit":
      return `当前文本的气口和悬念是成立的，但有两点要注意。\n\n第一，钟声提前和匿名来信都很强，如果同一段里解释过多，悬念会互相打架，建议只解释一个，另一个先压着。\n\n第二，老齐的台词适合更短一点。他知道得多，但不该在第一章就说得太完整，否则后面可揭的层次会变薄。`;
    default:
      return input.currentText;
  }
}

function buildFallbackMeta(input: WritingAssistInput): WritingAssistMeta {
  return {
    requestedModel: input.modelSelection,
    resolvedProvider: "fallback",
    resolvedModel: "local-fallback",
    usedFallback: true
  };
}

function buildFallbackResponse(input: WritingAssistInput): WritingAssistResponse {
  const primary: WritingSuggestion = {
    title: "主建议",
    text: buildPrimaryText(input),
    why:
      input.mode === "rewrite"
        ? "这版把形容词压下去了，更多依靠动作、物件和停顿来传情绪。"
        : "这版延续了当前场景的悬念，同时尽量保留人物的克制感。"
  };

  const alternatives: WritingSuggestion[] = [
    {
      title: "备选 1",
      text: "把重点放在人物选择上，不急着抛新设定。让主角先决定开不开信、信不信师父，这样人味会更足。",
      why: "先抓选择，读者会更容易跟进主角。"
    },
    {
      title: "备选 2",
      text: "把环境描写再收一点，只保留能推动判断的细节，比如潮位、风向、钟壳的震动，不必每样都写满。",
      why: "能减少“AI 过度修辞”的痕迹，让信息更聚焦。"
    }
  ];

  return {
    mode: input.mode,
    summary: "建议保持克制写法，让悬念落在动作和代价上，而不是形容词上。",
    primary,
    alternatives,
    warnings: [
      input.foreshadows.length > 0 ? "注意别在同一段里把伏笔解释得太满。" : "当前没有检测到明显设定冲突。"
    ],
    nextContext: [
      "下一步可以补一句主角为什么对“第三声钟响”格外在意。",
      "如果让师父出场，台词尽量短，让信息只露半截。"
    ],
    meta: buildFallbackMeta(input)
  };
}

function normalizeSuggestion(input: unknown): WritingSuggestion {
  const value = (input ?? {}) as Partial<WritingSuggestion>;

  return {
    title: value.title ?? "建议",
    text: value.text ?? "",
    why: value.why ?? "未提供说明。"
  };
}

function normalizeMeta(input: unknown, fallbackMeta: WritingAssistMeta): WritingAssistMeta {
  const value = (input ?? {}) as Partial<WritingAssistMeta>;

  return {
    requestedModel: fallbackMeta.requestedModel,
    resolvedProvider: value.resolvedProvider ?? fallbackMeta.resolvedProvider,
    resolvedModel: value.resolvedModel ?? fallbackMeta.resolvedModel,
    usedFallback: value.usedFallback ?? fallbackMeta.usedFallback
  };
}

function normalizeResponse(
  input: unknown,
  fallbackMode: WritingAssistInput["mode"],
  fallbackMeta: WritingAssistMeta
): WritingAssistResponse {
  const value = (input ?? {}) as Partial<WritingAssistResponse>;

  return {
    mode: value.mode ?? fallbackMode,
    summary: value.summary ?? "已生成建议。",
    primary: normalizeSuggestion(value.primary),
    alternatives: Array.isArray(value.alternatives) ? value.alternatives.map(normalizeSuggestion).slice(0, 2) : [],
    warnings: Array.isArray(value.warnings) ? value.warnings.filter((item): item is string => typeof item === "string") : [],
    nextContext: Array.isArray(value.nextContext)
      ? value.nextContext.filter((item): item is string => typeof item === "string")
      : [],
    meta: normalizeMeta(value.meta, fallbackMeta)
  };
}

export async function runWritingAssist(input: WritingAssistInput): Promise<WritingAssistResponse> {
  // Keep the full request payload intact so fallback and routed model paths see the same context.
  const requestInput: WritingAssistInput = input;

  if (!isAiConfigured) {
    return buildFallbackResponse(requestInput);
  }

  try {
    const response = await callRoutedJsonModel({
      messages: [
        {
          role: "system",
          content: buildSystemPrompt()
        },
        {
          role: "user",
          content: buildUserPrompt(requestInput)
        }
      ],
      modelSelection: requestInput.modelSelection
    });

    return normalizeResponse(response.payload, requestInput.mode, response.meta);
  } catch {
    return buildFallbackResponse(requestInput);
  }
}
