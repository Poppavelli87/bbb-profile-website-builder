import fs from "fs";
import path from "path";

function writableBase(): string {
  if (process.env.VERCEL) {
    return path.join("/tmp", "bbb-profile-builder");
  }
  return path.join(process.cwd(), "data");
}

export const dataRoot = writableBase();
export const projectStorageDir = path.join(dataRoot, "projects");
export const generatedRoot = path.join(dataRoot, "output");
export const uploadsRoot = path.join(dataRoot, "uploads");
export const siteStorageDir = path.join(dataRoot, "sites");

export function ensureRuntimeDirs(): void {
  [dataRoot, projectStorageDir, generatedRoot, uploadsRoot, siteStorageDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

export function safeResolve(baseDir: string, ...segments: string[]): string | null {
  const base = path.resolve(baseDir);
  const resolved = path.resolve(baseDir, ...segments);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
    return null;
  }
  return resolved;
}
