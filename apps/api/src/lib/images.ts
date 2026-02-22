import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import type { ImageAsset } from "@bbb/shared";
import { uploadsRoot } from "./paths";

const MAX_IMAGE_DIMENSION = 1800;

async function fetchImageBuffer(imageUrl: string): Promise<Buffer | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        "user-agent": "BBB-Profile-Website-Builder/1.0"
      }
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function downloadPublicImages(
  projectId: string,
  images: ImageAsset[]
): Promise<ImageAsset[]> {
  const targetDir = path.join(uploadsRoot, projectId);
  await fs.mkdir(targetDir, { recursive: true });

  const updated: ImageAsset[] = [];
  for (const image of images.slice(0, 12)) {
    if (!/^https?:\/\//i.test(image.url)) {
      updated.push(image);
      continue;
    }

    const raw = await fetchImageBuffer(image.url);
    if (!raw) {
      updated.push(image);
      continue;
    }

    const fileName = `${uuidv4()}.webp`;
    const fullPath = path.join(targetDir, fileName);

    try {
      await sharp(raw)
        .rotate()
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(fullPath);

      updated.push({
        ...image,
        url: `/uploads/${projectId}/${fileName}`
      });
    } catch {
      updated.push(image);
    }
  }

  return updated;
}

export async function saveUploadedImage(
  projectId: string,
  sourceBuffer: Buffer,
  altText: string
): Promise<ImageAsset> {
  const targetDir = path.join(uploadsRoot, projectId);
  await fs.mkdir(targetDir, { recursive: true });

  const fileName = `${uuidv4()}.webp`;
  const fullPath = path.join(targetDir, fileName);

  await sharp(sourceBuffer)
    .rotate()
    .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86 })
    .toFile(fullPath);

  return {
    id: uuidv4(),
    source: "uploaded",
    url: `/uploads/${projectId}/${fileName}`,
    alt: altText,
    selectedHero: false
  };
}
