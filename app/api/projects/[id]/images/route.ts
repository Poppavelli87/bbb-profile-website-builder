import { NextResponse } from "next/server";
import { ensureRuntimeDirs } from "@/lib/server/paths";
import { getProject, updateProject } from "@/lib/server/storage";
import { saveUploadedImage } from "@/lib/server/images";

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

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const imageAsset = await saveUploadedImage(params.id, bytes, file.type || null, file.name || "Uploaded image");

  const updated = await updateProject(params.id, (current) => ({
    ...current,
    profile: {
      ...current.profile,
      images: [...current.profile.images, imageAsset]
    },
    updatedAt: new Date().toISOString()
  }));

  return NextResponse.json({ project: updated });
}
