import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createNovelWithSeedData, getNovelSummaries } from "@/lib/repositories/novels";

export async function GET() {
  const novels = await getNovelSummaries();
  return NextResponse.json({ novels });
}

export async function POST(request: Request) {
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

    const novel = await createNovelWithSeedData(payload);

    return NextResponse.json({ novel }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "建书信息校验失败",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "Database is not configured.") {
      return NextResponse.json(
        {
          error: "数据库未配置，暂时无法创建书籍。"
        },
        { status: 503 }
      );
    }

    if (error instanceof Error && error.message === "Novel slug conflict.") {
      return NextResponse.json(
        {
          error: "同名书籍创建冲突，请重试。"
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "创建书籍失败"
      },
      { status: 500 }
    );
  }
}
