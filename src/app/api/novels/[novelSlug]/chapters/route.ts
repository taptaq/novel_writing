import { NextResponse } from "next/server";
import {
  createChapter,
  isChapterRepositoryError
} from "@/lib/repositories/novels";
import { decodeRouteParam } from "@/lib/route-params";

export async function POST(_: Request, { params }: { params: { novelSlug: string } }) {
  try {
    const result = await createChapter(decodeRouteParam(params.novelSlug));

    return NextResponse.json(result);
  } catch (error) {
    if (isChapterRepositoryError(error)) {
      if (error.code === "NOVEL_NOT_FOUND") {
        return NextResponse.json({ message: "Novel not found." }, { status: 404 });
      }
    }

    return NextResponse.json(
      {
        error: "创建章节失败"
      },
      { status: 500 }
    );
  }
}
