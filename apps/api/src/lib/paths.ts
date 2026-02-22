import path from "path";
import fs from "fs";

export const apiRoot = process.cwd();
export const repoRoot = process.env.REPO_ROOT || path.resolve(apiRoot, "../..");

export const storageRoot = path.join(apiRoot, "storage");
export const projectStorageDir = path.join(storageRoot, "projects");
export const generatedRoot = path.join(apiRoot, "generated");
export const uploadsRoot = path.join(apiRoot, "uploads");
export const generatedSitesRoot = path.join(repoRoot, "generated-sites");

export function ensureRuntimeDirs(): void {
  [storageRoot, projectStorageDir, generatedRoot, uploadsRoot, generatedSitesRoot].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}
