import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { ImageAsset } from "@/lib/shared";
import { safeResolve, uploadsRoot } from "./paths";

function extensionFromMime(mimeType: string | null): string {
  if (!mimeType) return "bin";
  if (mimeType.includes("jpeg")) return "jpg";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("webp")) return "webp";
  return "bin";
}

export async function saveUploadedImage(
  projectId: string,
  fileBuffer: Buffer,
  mimeType: string | null,
  altText: string
): Promise<ImageAsset> {
  const ext = extensionFromMime(mimeType);
  const fileName = `${randomUUID()}.${ext}`;
  const targetDir = safeResolve(uploadsRoot, projectId);
  if (!targetDir) {
    throw new Error("Invalid upload path.");
  }

  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, fileName), fileBuffer);

  return {
    id: randomUUID(),
    source: "uploaded",
    url: `/api/uploads/${projectId}/${fileName}`,
    alt: altText,
    selectedHero: false
  };
}
