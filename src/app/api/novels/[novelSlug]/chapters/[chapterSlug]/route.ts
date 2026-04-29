import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  isChapterRepositoryError,
  saveChapterDraft
} from "@/lib/repositories/novels";

const chapterRouteParamsSchema = z.object({
  novelSlug: z.string().trim().min(1),
  chapterSlug: z.string().trim().min(1)
});

const chapterDraftSchema = z.object({
  plainText: z.string(),
  source: z.enum(["manual", "autosave"]),
  note: z.string().trim().optional(),
  expectedUpdatedAt: z.string().datetime().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: { novelSlug: string; chapterSlug: string } }
) {
  try {
    const routeParams = chapterRouteParamsSchema.parse(params);
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "请求体不是有效的 JSON。"
        },
        { status: 400 }
      );
    }

    const draft = chapterDraftSchema.parse(payload);
    const result = await saveChapterDraft(routeParams.novelSlug, routeParams.chapterSlug, draft);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "章节保存参数校验失败",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    if (isChapterRepositoryError(error)) {
      if (error.code === "NOVEL_NOT_FOUND") {
        return NextResponse.json({ message: "Novel not found." }, { status: 404 });
      }

      if (error.code === "CHAPTER_NOT_FOUND") {
        return NextResponse.json({ message: "Chapter not found." }, { status: 404 });
      }

      if (error.code === "STALE_CHAPTER_DRAFT") {
        return NextResponse.json(
          {
            error: "这章在别处被改过，请刷新后再继续。"
          },
          { status: 409 }
        );
      }

      if (error.code === "DATABASE_NOT_CONFIGURED") {
        return NextResponse.json(
          {
            error: "数据库未配置，暂时无法保存章节。"
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "保存章节失败"
      },
      { status: 500 }
    );
  }
}
