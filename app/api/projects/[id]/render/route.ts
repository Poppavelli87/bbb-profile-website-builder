import path from "path";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  normalizeGeneratedContent,
  runComplianceChecks,
  toComplianceProfile
} from "@/lib/shared";
import { zipDirectory } from "@/lib/server/archive";
import { generateStaticSite } from "@/lib/server/generator";
import { ensureRuntimeDirs, generatedRoot } from "@/lib/server/paths";
import { getProject, updateProject } from "@/lib/server/storage";

export const runtime = "nodejs";

const payloadSchema = z.object({
  includeLlmsTxt: z.boolean().default(true),
  includeHumansTxt: z.boolean().default(true),
  status: z.enum(["draft", "generated", "edited", "saved"]).optional()
});

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
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid render payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const content = normalizeGeneratedContent(project.profile, project.content);
  const compliance = runComplianceChecks(toComplianceProfile(project.profile, content));
  const generated = await generateStaticSite(
    {
      ...project,
      content
    },
    compliance,
    {
      includeLlmsTxt: parsed.data.includeLlmsTxt,
      includeHumansTxt: parsed.data.includeHumansTxt
    }
  );
  const zipPath = path.join(generatedRoot, project.id, `${generated.slug}.zip`);
  await zipDirectory(generated.siteDir, zipPath);

  const status = parsed.data.status || "generated";
  const updated = await updateProject(params.id, (current) => ({
    ...current,
    content,
    compliance,
    status,
    generationPath: generated.siteDir,
    zipPath,
    generatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  return NextResponse.json({
    project: updated,
    previewUrl: `/api/preview/${project.id}/${generated.slug}/index.html`
  });
}
