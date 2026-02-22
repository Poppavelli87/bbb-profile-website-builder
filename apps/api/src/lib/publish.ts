import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import type { ProjectRecord } from "@bbb/shared";
import { generatedSitesRoot, repoRoot } from "./paths";

const execFileAsync = promisify(execFile);

export type PublishResult = {
  destination: string;
  createPrAttempted: boolean;
  prUrl?: string;
  instructions?: string;
};

async function copyDirRecursive(source: string, destination: string): Promise<void> {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      await copyDirRecursive(sourcePath, destinationPath);
    } else {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

async function commandExists(command: string, args: string[]): Promise<boolean> {
  try {
    await execFileAsync(command, args, { cwd: repoRoot });
    return true;
  } catch {
    return false;
  }
}

export async function publishGeneratedSite(
  project: ProjectRecord,
  siteDir: string,
  createPr: boolean
): Promise<PublishResult> {
  const destination = path.join(generatedSitesRoot, project.profile.slug);
  await fs.rm(destination, { recursive: true, force: true });
  await copyDirRecursive(siteDir, destination);

  if (!createPr) {
    return {
      destination,
      createPrAttempted: false
    };
  }

  const hasGit = await commandExists("git", ["rev-parse", "--is-inside-work-tree"]);
  const hasGh = await commandExists("gh", ["--version"]);

  if (!hasGit || !hasGh) {
    return {
      destination,
      createPrAttempted: true,
      instructions:
        "gh CLI or git is unavailable. Manually run: git checkout -b generated-site/<slug>; git add generated-sites/<slug>; git commit; gh pr create."
    };
  }

  const branch = `generated-site/${project.profile.slug}-${Date.now()}`;
  const relative = path.relative(repoRoot, destination).replace(/\\/g, "/");

  try {
    await execFileAsync("git", ["checkout", "-b", branch], { cwd: repoRoot });
    await execFileAsync("git", ["add", relative], { cwd: repoRoot });

    try {
      await execFileAsync("git", ["commit", "-m", `Add generated site for ${project.profile.name}`], {
        cwd: repoRoot
      });
    } catch {
      return {
        destination,
        createPrAttempted: true,
        instructions: "No commit created (possibly no changes). Review generated-sites changes and commit manually."
      };
    }

    const { stdout } = await execFileAsync(
      "gh",
      [
        "pr",
        "create",
        "--title",
        `Add generated site: ${project.profile.name}`,
        "--body",
        "Automated publish from BBB Profile Website Builder.",
        "--base",
        "main",
        "--head",
        branch
      ],
      { cwd: repoRoot }
    );

    const prUrl = stdout.trim().split(/\s+/).find((token) => token.startsWith("http"));

    return {
      destination,
      createPrAttempted: true,
      prUrl,
      instructions: prUrl
        ? undefined
        : "PR command completed but URL was not detected. Run `gh pr view --web` to confirm."
    };
  } catch (error) {
    return {
      destination,
      createPrAttempted: true,
      instructions:
        error instanceof Error
          ? `Unable to auto-create PR: ${error.message}`
          : "Unable to auto-create PR. Run git/gh commands manually."
    };
  }
}
