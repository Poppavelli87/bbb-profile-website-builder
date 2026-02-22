import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { ensureRuntimeDirs } from "@/lib/server/paths";
import { getProject } from "@/lib/server/storage";

export const runtime = "nodejs";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  ensureRuntimeDirs();
  const project = await getProject(params.id);
  if (!project?.zipPath) {
    return NextResponse.json({ error: "Generated zip is not available for this project." }, { status: 404 });
  }
  if (!fs.existsSync(project.zipPath)) {
    return NextResponse.json({ error: "Zip file missing on disk." }, { status: 404 });
  }

  const file = await fs.promises.readFile(project.zipPath);
  const filename = `${project.profile.slug || path.basename(project.zipPath, ".zip")}.zip`;
  return new NextResponse(file, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename=\"${filename}\"`
    }
  });
}
