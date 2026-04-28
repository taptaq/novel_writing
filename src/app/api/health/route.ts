import { NextResponse } from "next/server";
import { isAiConfigured, isDatabaseConfigured } from "@/lib/env";

export function GET() {
  return NextResponse.json({
    ok: true,
    databaseConfigured: isDatabaseConfigured,
    aiConfigured: isAiConfigured
  });
}
