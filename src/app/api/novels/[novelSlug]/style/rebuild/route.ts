import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isNovelStyleRepositoryError } from "@/lib/novel-style";
import { rebuildNovelStyleProfile } from "@/lib/repositories/novels";

export async function POST(_: Request, { params }: { params: { novelSlug: string } }) {
  try {
    const profile = await rebuildNovelStyleProfile(params.novelSlug);

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "文风重提炼参数校验失败",
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
            error: "数据库未配置，暂时无法重建文风画像。"
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "重建文风画像失败"
      },
      { status: 500 }
    );
  }
}
