import { NextResponse } from "next/server";
import { extractRequestSchema } from "@/lib/shared";
import { extractFromBbbUrl } from "@/lib/server/extractor";
import { ensureRuntimeDirs } from "@/lib/server/paths";

export const runtime = "nodejs";

export async function POST(request: Request) {
  ensureRuntimeDirs();
  const body = await request.json().catch(() => null);
  const parsed = extractRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid extract request.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const result = await extractFromBbbUrl(parsed.data.url);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
