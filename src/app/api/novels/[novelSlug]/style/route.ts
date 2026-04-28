import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isNovelStyleRepositoryError } from "@/lib/novel-style";
import {
  getNovelStyleWorkspace,
  updateNovelStyleProfile
} from "@/lib/repositories/novels";

export async function GET(_: Request, { params }: { params: { novelSlug: string } }) {
  try {
    const workspace = await getNovelStyleWorkspace(params.novelSlug);

    if (!workspace) {
      return NextResponse.json({ message: "Novel not found." }, { status: 404 });
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    if (isNovelStyleRepositoryError(error)) {
      if (error.code === "NOVEL_NOT_FOUND") {
        return NextResponse.json({ message: "Novel not found." }, { status: 404 });
      }

      if (error.code === "DATABASE_NOT_CONFIGURED") {
        return NextResponse.json(
          {
            error: "数据库未配置，暂时无法读取文风资产。"
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "读取文风资产失败"
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: { novelSlug: string } }) {
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

    const profile = await updateNovelStyleProfile(params.novelSlug, payload);

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "文风画像校验失败",
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
            error: "数据库未配置，暂时无法更新文风画像。"
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "更新文风画像失败"
      },
      { status: 500 }
    );
  }
}
