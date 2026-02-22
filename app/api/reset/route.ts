import fs from "fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureRuntimeDirs, generatedRoot, safeResolve, uploadsRoot } from "@/lib/server/paths";
import { deleteProjectFile } from "@/lib/server/storage";

export const runtime = "nodejs";

const payloadSchema = z.object({
  projectId: z.string().min(1).optional()
});

async function removeDirIfAllowed(base: string, projectId: string): Promise<void> {
  const target = safeResolve(base, projectId);
  if (!target) return;
  await fs.rm(target, { recursive: true, force: true });
}

export async function POST(request: Request) {
  ensureRuntimeDirs();
  const body = await request.json().catch(() => ({}));
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid reset payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const projectId = parsed.data.projectId;
  if (projectId) {
    await removeDirIfAllowed(generatedRoot, projectId);
    await removeDirIfAllowed(uploadsRoot, projectId);
    await deleteProjectFile(projectId);
  }

  return NextResponse.json({ ok: true });
}
