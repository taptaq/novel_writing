import { NextResponse } from "next/server";
import { z } from "zod";
import type { ChatMessage } from "@/lib/ai/client";
import { callRoutedJsonModel } from "@/lib/ai/router";
import {
  buildSetupChineseRewritePrompt,
  buildSetupParsingPrompt
} from "@/lib/ai/prompts";
import { detectSetupFileType } from "@/lib/file-text-extractor";
import type { SetupFileType } from "@/lib/file-text-extractor";
import { normalizeSetupSourceText } from "@/lib/file-text-extractor";
import { normalizeParsedSetupDraft } from "@/lib/novel-setup-parser";
import type { ParsedSetupDraft } from "@/types/domain";

const setupFileTypes = ["text", "markdown", "docx", "pdf"] as const satisfies readonly SetupFileType[];

const payloadSchema = z.object({
  sourceName: z.string().trim().min(1).optional(),
  sourceType: z.enum(setupFileTypes).optional(),
  sourceText: z.string().trim().min(20)
});

const setupParseSystemPrompt =
  "你是中文小说设定解析助手。只返回合法 JSON，不要输出英文说明，用户可见字段值必须使用简体中文。";
const setupRewriteSystemPrompt =
  "你是中文小说设定整理助手。你只能把已有 JSON 草稿改写为简体中文，不能补充新事实，不能改变结构。只返回合法 JSON。";

const englishStopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "gets",
  "in",
  "into",
  "is",
  "of",
  "old",
  "on",
  "or",
  "port",
  "readers",
  "the",
  "to",
  "with"
]);

function containsLikelyEnglishSentence(value: string) {
  const words = value.match(/\b[A-Za-z]{2,}\b/g) ?? [];

  if (words.length < 3) {
    return false;
  }

  const stopWordCount = words.filter((word) => englishStopWords.has(word.toLowerCase())).length;
  return words.length >= 4 || stopWordCount >= 2;
}

function collectVisibleStrings(value: unknown, key?: string): string[] {
  if (key === "guessedFields" || key === "missingFields") {
    return [];
  }

  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectVisibleStrings(item));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).flatMap(([entryKey, entryValue]) =>
    collectVisibleStrings(entryValue, entryKey)
  );
}

function shouldRewriteSetupDraftToChinese(draft: ParsedSetupDraft) {
  return collectVisibleStrings(draft).some((value) => containsLikelyEnglishSentence(value));
}

export async function POST(request: Request) {
  try {
    const payload = payloadSchema.parse(await request.json());
    const detectedSourceType = payload.sourceName
      ? detectSetupFileType(payload.sourceName)
      : null;

    if (
      payload.sourceType &&
      detectedSourceType &&
      payload.sourceType !== detectedSourceType
    ) {
      return NextResponse.json(
        {
          message: "sourceType does not match sourceName."
        },
        { status: 400 }
      );
    }

    const effectiveSourceType = payload.sourceType ?? detectedSourceType;

    if (effectiveSourceType === "docx" || effectiveSourceType === "pdf") {
      return NextResponse.json(
        {
          message: "暂不支持直接解析该文件，请先转换为 txt 或 md 后再上传。"
        },
        { status: 400 }
      );
    }

    const normalizedSourceText = normalizeSetupSourceText(payload.sourceText);
    const promptPreview = buildSetupParsingPrompt(normalizedSourceText);
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: setupParseSystemPrompt
      },
      {
        role: "user",
        content: promptPreview
      }
    ];
    const response = await callRoutedJsonModel({
      messages,
      modelSelection: "auto"
    });
    let draft = normalizeParsedSetupDraft(response.payload);

    if (shouldRewriteSetupDraftToChinese(draft)) {
      try {
        const rewriteResponse = await callRoutedJsonModel({
          messages: [
            {
              role: "system",
              content: setupRewriteSystemPrompt
            },
            {
              role: "user",
              content: buildSetupChineseRewritePrompt(response.payload)
            }
          ],
          modelSelection: "auto"
        });

        draft = normalizeParsedSetupDraft(rewriteResponse.payload);
      } catch {
        // Best-effort rewrite only; keep the first parsed draft if the second pass fails.
      }
    }

    return NextResponse.json({ draft, promptPreview });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: "Invalid parse-setup payload."
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: "Setup parsing failed."
      },
      { status: 500 }
    );
  }
}
