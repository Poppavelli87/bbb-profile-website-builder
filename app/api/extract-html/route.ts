import { NextResponse } from "next/server";
import { z } from "zod";
import { extractFromProvidedHtml } from "@/lib/server/extractor";
import { ensureRuntimeDirs } from "@/lib/server/paths";

const payloadSchema = z.object({
  html: z.string().min(1),
  sourceUrl: z.string().url().optional().default("https://www.bbb.org/profile/")
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  ensureRuntimeDirs();
  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid HTML extraction payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const extracted = extractFromProvidedHtml(parsed.data.html, parsed.data.sourceUrl);
  return NextResponse.json({
    ok: true,
    data: extracted
  });
}
