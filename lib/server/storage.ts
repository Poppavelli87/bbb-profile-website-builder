import fs from "fs/promises";
import path from "path";
import type { ProjectRecord } from "@/lib/shared";
import { ensureRuntimeDirs, projectStorageDir } from "./paths";
import { hydrateProject } from "./project";

function projectFile(projectId: string): string {
  return path.join(projectStorageDir, `${projectId}.json`);
}

export async function saveProject(project: ProjectRecord): Promise<void> {
  ensureRuntimeDirs();
  await fs.writeFile(projectFile(project.id), JSON.stringify(project, null, 2), "utf8");
}

export async function getProject(projectId: string): Promise<ProjectRecord | null> {
  ensureRuntimeDirs();
  try {
    const raw = await fs.readFile(projectFile(projectId), "utf8");
    return hydrateProject(JSON.parse(raw) as ProjectRecord);
  } catch {
    return null;
  }
}

export async function updateProject(
  projectId: string,
  updater: (project: ProjectRecord) => ProjectRecord
): Promise<ProjectRecord | null> {
  const current = await getProject(projectId);
  if (!current) {
    return null;
  }
  const updated = updater(current);
  await saveProject(updated);
  return updated;
}

export async function listProjects(): Promise<ProjectRecord[]> {
  ensureRuntimeDirs();
  try {
    const files = await fs.readdir(projectStorageDir);
    const projects = await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map(async (file) => {
          const raw = await fs.readFile(path.join(projectStorageDir, file), "utf8");
          return hydrateProject(JSON.parse(raw) as ProjectRecord);
        })
    );
    return projects.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function deleteProjectFile(projectId: string): Promise<void> {
  ensureRuntimeDirs();
  await fs.rm(projectFile(projectId), { force: true });
}
