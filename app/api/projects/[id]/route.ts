import { NextResponse } from "next/server";
import { businessProfileSchema, createSlug } from "@/lib/shared";
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
  const body = (await request.json().catch(() => null)) as { profile?: unknown } | null;
  const parsed = businessProfileSchema.safeParse(body?.profile);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid profile payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const updated = await updateProject(params.id, (project) => ({
    ...project,
    profile: {
      ...parsed.data,
      slug: createSlug(parsed.data.slug || parsed.data.name)
    },
    updatedAt: new Date().toISOString()
  }));

  if (!updated) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ project: updated });
}
