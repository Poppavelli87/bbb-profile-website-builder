import path from "path";
import {
  generateProjectSchema,
  normalizeGeneratedContent,
  runComplianceChecks,
  toComplianceProfile,
  type ProjectRecord
} from "@/lib/shared";
import type { z } from "zod";
import { zipDirectory } from "./archive";
import { generateStaticSite } from "./generator";
import { generatedRoot } from "./paths";
import { getProject, saveProject, updateProject } from "./storage";
import { updateJob } from "./jobs";

export async function runGenerationJob(
  jobId: string,
  projectId: string,
  options: z.infer<typeof generateProjectSchema>
): Promise<void> {
  updateJob(jobId, {
    status: "running",
    startedAt: new Date().toISOString()
  });

  try {
    await updateProject(projectId, (project) => ({
      ...project,
      status: "generating",
      updatedAt: new Date().toISOString(),
      lastError: undefined
    }));

    const project = await getProject(projectId);
    if (!project) {
      throw new Error("Project not found during generation.");
    }

    const content = normalizeGeneratedContent(project.profile, project.content);
    const compliance = runComplianceChecks(toComplianceProfile(project.profile, content));
    const generated = await generateStaticSite({ ...project, content }, compliance, options);
    const zipPath = path.join(generatedRoot, project.id, `${generated.slug}.zip`);
    await zipDirectory(generated.siteDir, zipPath);

    const nextProject: ProjectRecord = {
      ...project,
      status: "generated",
      content,
      compliance,
      generationPath: generated.siteDir,
      zipPath,
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveProject(nextProject);

    updateJob(jobId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      result: {
        generationPath: generated.siteDir,
        zipPath,
        previewUrl: `/api/preview/${project.id}/${generated.slug}/index.html`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown generation error.";
    await updateProject(projectId, (project) => ({
      ...project,
      status: "error",
      updatedAt: new Date().toISOString(),
      lastError: message
    }));

    updateJob(jobId, {
      status: "failed",
      completedAt: new Date().toISOString(),
      error: message
    });
  }
}
