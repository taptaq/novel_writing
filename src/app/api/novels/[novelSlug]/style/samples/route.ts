import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isNovelStyleRepositoryError } from "@/lib/novel-style";
import { addNovelStyleSample } from "@/lib/repositories/novels";

export async function POST(request: Request, { params }: { params: { novelSlug: string } }) {
  try {
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

    const sample = await addNovelStyleSample(params.novelSlug, payload);

    return NextResponse.json({ sample }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "风格参考样文校验失败",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    if (isNovelStyleRepositoryError(error)) {
      if (error.code === "NOVEL_NOT_FOUND") {
        return NextResponse.json({ message: "Novel not found." }, { status: 404 });
      }

      if (error.code === "DATABASE_NOT_CONFIGURED") {
        return NextResponse.json(
          {
            error: "数据库未配置，暂时无法保存参考样文。"
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "保存参考样文失败"
      },
      { status: 500 }
    );
  }
}
