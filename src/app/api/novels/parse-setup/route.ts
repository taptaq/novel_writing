import { NextResponse } from "next/server";
import { z } from "zod";
import type { ChatMessage } from "@/lib/ai/client";
import { callRoutedJsonModel } from "@/lib/ai/router";
import { buildSetupParsingPrompt } from "@/lib/ai/prompts";
import { detectSetupFileType } from "@/lib/file-text-extractor";
import type { SetupFileType } from "@/lib/file-text-extractor";
import { normalizeSetupSourceText } from "@/lib/file-text-extractor";
import { normalizeParsedSetupDraft } from "@/lib/novel-setup-parser";

const setupFileTypes = ["text", "markdown", "docx", "pdf"] as const satisfies readonly SetupFileType[];

const payloadSchema = z.object({
  sourceName: z.string().trim().min(1).optional(),
  sourceType: z.enum(setupFileTypes).optional(),
  sourceText: z.string().trim().min(20)
});

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
        content: "You extract structured novel setup data. Return valid JSON only."
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
    const draft = normalizeParsedSetupDraft(response.payload);

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
