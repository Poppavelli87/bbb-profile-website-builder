import { NextResponse } from "next/server";
import { createJob } from "@/lib/server/jobs";
import { runGenerationJob } from "@/lib/server/generation";
import { ensureRuntimeDirs } from "@/lib/server/paths";
import { getProject } from "@/lib/server/storage";
import { generateProjectSchema } from "@/lib/shared";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  ensureRuntimeDirs();
  const project = await getProject(params.id);
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = generateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid generation payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const job = createJob(params.id);
  void runGenerationJob(job.id, params.id, parsed.data);

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
