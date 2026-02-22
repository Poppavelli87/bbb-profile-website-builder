import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import {
  applyLayoutPreset,
  createProjectSchema,
  createSlug,
  normalizeGeneratedContent,
  normalizeTheme,
  projectSchema
} from "@/lib/shared";
import { ensureRuntimeDirs } from "@/lib/server/paths";
import { listProjects, saveProject } from "@/lib/server/storage";

export const runtime = "nodejs";

export async function GET() {
  ensureRuntimeDirs();
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  ensureRuntimeDirs();
  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid project payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const profile = {
    ...parsed.data.profile,
    slug: createSlug(parsed.data.profile.slug || parsed.data.profile.name)
  };
  const layout = applyLayoutPreset("local-service-classic");
  const theme = normalizeTheme();
  const content = normalizeGeneratedContent(profile);
  const project = projectSchema.parse({
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "draft",
    profile,
    theme,
    layout: layout.layout,
    sections: layout.sections,
    content,
    substantiationNotes: {}
  });

  await saveProject(project);
  return NextResponse.json({ project }, { status: 201 });
}
