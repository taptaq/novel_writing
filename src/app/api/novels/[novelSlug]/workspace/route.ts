import { NextResponse } from "next/server";
import { getNovelWorkspace } from "@/lib/repositories/novels";
import { decodeRouteParam } from "@/lib/route-params";

export async function GET(_: Request, { params }: { params: { novelSlug: string } }) {
  const workspace = await getNovelWorkspace(decodeRouteParam(params.novelSlug));

  if (!workspace) {
    return NextResponse.json({ message: "Novel not found." }, { status: 404 });
  }

  return NextResponse.json({ workspace });
}
