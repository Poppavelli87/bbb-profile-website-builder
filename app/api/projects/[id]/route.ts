import { NextResponse } from "next/server";
import { createSlug, normalizeGeneratedContent, normalizeSections, normalizeTheme, updateProjectSchema } from "@/lib/shared";
import { ensureRuntimeDirs } from "@/lib/server/paths";
import { getProject, updateProject } from "@/lib/server/storage";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  ensureRuntimeDirs();
  const project = await getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function PUT(request: Request, { params }: Params) {
  ensureRuntimeDirs();
  const body = await request.json().catch(() => null);
  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid project update payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const updated = await updateProject(params.id, (project) => ({
    ...project,
    profile: payload.profile
      ? {
          ...payload.profile,
          slug: createSlug(payload.profile.slug || payload.profile.name)
        }
      : project.profile,
    theme: payload.theme ? normalizeTheme(payload.theme) : project.theme,
    layout: payload.layout || project.layout,
    sections: payload.sections
      ? normalizeSections(payload.layout || project.layout, payload.sections)
      : normalizeSections(payload.layout || project.layout, project.sections),
    content: payload.content
      ? normalizeGeneratedContent(payload.profile || project.profile, payload.content)
      : normalizeGeneratedContent(payload.profile || project.profile, project.content),
    substantiationNotes: payload.substantiationNotes || project.substantiationNotes || {},
    status: payload.status || project.status,
    updatedAt: new Date().toISOString()
  }));

  if (!updated) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ project: updated });
}
